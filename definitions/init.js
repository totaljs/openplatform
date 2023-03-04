require('querybuilderpg').init('', CONF.database, CONF.pooling || 1, ERROR('PostgreSQL'));

MAIN.cache = {};

async function reconfigure() {

	var db = DB();
	var config = await db.find('op.cl_config').fields('id,value,type').promise();

	LOADCONFIG(config);

	if (!CONF.id)
		CONF.id = Date.now().toString(36);

	if (!CONF.icon)
		CONF.icon = '/img/icon.png';

	if (!CONF.color)
		CONF.color = '#4285F4';

	var hostname = CONF.url;
	if (hostname) {
		if (hostname[hostname.length - 1] === '/')
			hostname = hostname.substring(0, hostname.length - 1);
		CONF.url = hostname;
	}

	CONF.ismail = CONF.mail_smtp && CONF.mail_from ? true : false;

	EMIT('configure');
}

ON('service', async function(counter) {

	// 2 minutes
	// Clear internal cache
	if (counter % 2 === 0)
		FUNC.clearcacheinternal();

	// Make stats
	if (counter % 3 === 0)
		makestats();

	// 8 hours
	// Auto reconfiguration from DB
	if (counter % 480 === 0)
		reconfigure();

	var db;

	// 12 hours
	// Remove expired sessions
	if (counter % 720 === 0) {
		db = DB();
		db.remove('op.tbl_app_session').where('dtexpire<NOW()');
		db.remove('op.tbl_session').where('dtexpire<NOW()');
	}

	// 11 minutes
	// Email notifications
	if (CONF.ismail && counter % 11 === 0) {
		var users = await DB().query("UPDATE op.tbl_user SET unread=unread+1, dtnotified=NOW() WHERE isremoved=FALSE AND isdisabled=FALSE AND isonline=FALSE AND isinactive=FALSE AND unread>0 AND (dtnotified IS NULL OR (dtnotified + '3 days') <= NOW()) RETURNING id,language,name,color,email,unread").promise();
		for (var m of users) {
			if (!m.color)
				m.color = CONF.color;
			MAIL(m.email, '@(Unread notifications) ({0})'.format(m.unread), 'mail/unread', m, m.language || CONF.language || '');
		}
	}

});

NEWPUBLISH('Stats.create', 'online:Number,date:Date,device');
async function makestats() {

	var db = DB();
	var online = await db.query('SELECT COUNT(1)::int4 AS count FROM op.tbl_session WHERE isonline=TRUE').promise();

	online = online[0].count;

	if (online) {

		var devices = await db.query('SELECT device, COUNT(1)::int4 AS count FROM op.tbl_session WHERE isonline=TRUE GROUP BY device').promise();
		var model = {};

		model['>maxlogged'] = online;

		for (var m of devices)
			model['>' + m.device] = m.count;

		model.id = +NOW.format('yyyyMMdd');
		model.date = NOW;

		await db.modify('op.tbl_visitor', model, true).id(model.id).promise();
		PUBLISH('Stats.create', model);
	}
}

// Authorization
function auth() {

	NEWPUBLISH('Session.create', 'id,sessionid,photo,name,language,sa:Boolean,color:Color,isreset:Boolean,sounds:Boolean,notifications:Boolean,unread:Number');

	var options = {};
	var onprofile = (userid, callback) => DB().one('op.tbl_user').fields('id,photo,name,language,sa,color,interface,isreset,darkmode,sounds,notifications,unread').id(userid).where('isconfirmed=TRUE AND isdisabled=FALSE AND isinactive=FALSE AND isremoved=FALSE').callback(callback);

	function authconfig() {
		options.secret = CONF.auth_secret;
		options.cookie = CONF.auth_cookie;
		options.options = CONF.auth_cookie_options;
		options.expire = CONF.auth_expire || '5 minutes';
		options.strict = CONF.auth_strict == null || CONF.auth_strict == true;
		options.ddos = CONF.auth_ddos || 10;
	}

	options.onsession = function(session, $) {
		if ($.url === '/setup/') {
			if (session.data.sa)
				$.success(session.data);
			else
				$.invalid();
			return true;
		}
	};

	options.onread = async function(meta, next) {

		// meta.sessionid {String}
		// meta.userid {String}
		// meta.ua {String}
		// next(err, USER_DATA) {Function} callback function

		var db = DB();
		var session = await db.one('op.tbl_session').fields('id,userid').id(meta.sessionid).query('dtexpire>NOW()').promise();
		if (session) {
			onprofile(meta.userid, function(err, user) {
				if (user) {
					next(err, user);
					db.modify('op.tbl_session', { isonline: true, dtlogged: NOW, '+logged': 1, ua: meta.ua }).id(meta.sessionid);
					db.modify('op.tbl_user', { isreset: false, isonline: true, dtlogged: NOW, '+logged': 1 }).id(meta.userid);
					user.sessionid = meta.sessionid;
					PUBLISH('Session.create', user);
				} else
					next(err || 404);
			});
		} else
			next(404);
	};

	options.onfree = function(meta) {
		var mod = { isonline: false };
		var db = DB();
		meta.sessions && db.modify('op.tbl_session', mod).query('isonline=TRUE').id(meta.sessions);
		meta.users && db.modify('op.tbl_user', mod).query('isonline=TRUE').id(meta.users);
	};

	var db = DB();

	db.query('UPDATE op.tbl_session SET isonline=FALSE WHERE isonline=TRUE');
	db.query('UPDATE op.tbl_user SET isonline=FALSE WHERE isonline=TRUE');

	AUTH(options);
	DEF.onLocale = req => (req.user ? req.user.language : req.query.language) || CONF.language || '';

	ON('configure', authconfig);

	MAIN.auth = {};
	MAIN.auth.update = function(userid, fn) {
		options.update(userid, fn);
	};

	MAIN.auth.login = function($, userid, callback) {

		var obj = {};
		obj.id = UID();
		obj.userid = userid;
		obj.ua = $.controller.ua;
		obj.ip = $.ip;
		obj.device = $.mobile ? 'mobile' : 'desktop';
		obj.dtexpire = NOW.add(CONF.auth_cookie_expire || '1 month');
		obj.dtcreated = NOW;

		DB().insert('op.tbl_session', obj).callback(function() {
			options.authcookie($, obj.id, userid, CONF.auth_cookie_expire);
			callback && callback(null, obj);
		});

	};

	MAIN.auth.logout = function($, callback) {
		DB().remove('op.tbl_session').id($.session.sessionid).callback(function() {
			options.logout($);
			callback && callback();
		});
	};

	MAIN.auth.refresh = userid => options.refresh(userid);
	MAIN.reconfigure = reconfigure;

}

async function init() {

	var is = await DB().check('information_schema.tables').where('table_schema', 'op').where('table_name', 'cl_config').promise();

	if (is) {
		PAUSESERVER('Database');
		reconfigure();
		auth();
		return;
	}

	// DB is empty
	F.Fs.readFile(PATH.root('database.sql'), async function(err, buffer) {

		var data = {};
		data.id = U.random_string(15).toLowerCase();
		data.cookie = U.random_string(5).toLowerCase();
		data.secret = GUID(25);
		data.salt = GUID(25);
		data.saltchecksum = CONF.saltchecksum = GUID(25);
		data.secret = GUID(25);
		data.tms = GUID(35);
		data.url = CONF.url || '';
		data.token = FUNC.checksum(GUID(30));
		data.userid = UID();
		data.groupid = UID();
		data.password = 'admin'.sha256(data.salt);

		// Temporary
		CONF.welcome = true;

		var sql = buffer.toString('utf8').arg(data);

		// Run SQL
		await DB().query(sql).promise();
		reconfigure();
		auth();

		PAUSESERVER('Database');

	});

}

PAUSESERVER('Database');

// Docker
if (process.env.DATABASE)
	setTimeout(init, 3000);
else
	init();
