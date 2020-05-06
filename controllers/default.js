exports.install = function() {

	ROUTE('+GET  /', index);
	ROUTE('+GET  /admin/');
	ROUTE('+GET  /welcome/');

	ROUTE('GET /*', login, ['unauthorize']);
	ROUTE('GET /marketplace/');
	ROUTE('GET /logout/', logout);
	ROUTE('GET /lock/', lock);
	ROUTE('+GET /_intro/', 'intro');
	ROUTE('+GET /_profile/', 'profile');
	ROUTE('+GET /access/{token}/', accesstoken);

	ROUTE('+GET /oauth/authorize/', oauthauthorize);
	ROUTE('POST /oauth/token/', oauthsession);
	ROUTE('GET /oauth/profile/', oauthprofile);

	FILE('/manifest.json', manifest);
	ROUTE('#404', process404);
};

function index() {
	var self = this;
	var desktop = self.user.desktop;
	self.view(desktop === 3 ? 'portal' : desktop === 2 ? 'tabbed' : 'windowed');
	if (self.user.welcome)
		self.user.welcome = false;
}

function manifest(req, res) {
	var meta = {};
	meta.name = CONF.name;
	meta.short_name = CONF.name;
	meta.icons = [{ src: '/icon.png', size: '500x500', type: 'image/png' }];
	meta.start_url = '/';
	meta.display = 'standalone';
	res.json(meta);
}

function oauthauthorize() {
	var self = this;

	if (!CONF.allowoauth) {
		self.invalid('error-nooauth');
		return;
	}

	var url = self.query.redirect_uri || '';
	var id = self.query.client_id || '';

	if (!url || !id) {
		self.invalid('error-data');
		return;
	}

	DBMS().one('tbl_oauth').fields('id').where('id', id).query('blocked=FALSE').error('error-invalid-clientkey').callback(function(err) {
		if (err)
			self.invalid(err);
		else
			self.redirect(url + '?code=' + self.sessionid.encryptUID(CONF.hashsalt));
	});
}

function oauthsession() {

	var self = this;

	if (!CONF.allowoauth) {
		self.invalid('error-nooauth');
		return;
	}

	var filter = CONVERT(self.body, 'code:String,client_id:String,client_secret:String');
	var code = filter.code.decryptUID(CONF.hashsalt);

	if (!code) {
		self.invalid('error-invalid-accesstoken');
		return;
	}

	MAIN.session.get(code, function(err, profile, session) {

		if (!profile) {
			self.invalid('error-invalid-accesstoken');
			return;
		}

		DBMS().one('tbl_oauth').fields('name').where('id', filter.client_id).where('accesstoken', filter.client_secret).callback(function(err, response) {
			if (response) {
				var accesstoken = ENCRYPTREQ(self, { code: filter.code, userid: profile.id, id: filter.client_id }, CONF.hashsalt);
				self.json({ access_token: accesstoken, expire: session.expire });
			} else
				self.invalid('error-invalid-accesstoken');
		});

	});
}

var usage_oauth_insert = function(doc, params) {
	doc.id = params.id;
	doc.oauthid = params.oauthid;
	doc.date = NOW;
};

function oauthprofile() {

	var self = this;

	if (!CONF.allowoauth) {
		self.invalid('error-nooauth');
		return;
	}

	var token = self.headers.authorization.split(' ')[1];

	if (!token) {
		self.invalid('error-invalid-accesstoken');
		return;
	}

	var data = DECRYPTREQ(self, token, CONF.hashsalt);
	if (!data) {
		self.invalid('error-invalid-accesstoken');
		return;
	}

	var db = DBMS();
	db.one('tbl_oauth').where('id', data.id).fields('allowreadprofile').query('blocked=FALSE').set('oauth');
	db.err('error-invalid-accesstoken');
	db.one('tbl_user').where('id', data.userid).fields('id,supervisorid,deputyid,groupid,directory,directoryid,statusid,status,photo,name,linker,dateformat,timeformat,numberformat,firstname,lastname,gender,email,phone,company,language,reference,locality,position,colorscheme,repo,roles,groups,inactive,blocked,notifications,notificationsemail,notificationsphone,sa,darkmode,inactive,sounds,dtbirth,dtbeg,dtend,dtupdated,dtmodified,dtcreated,middlename,contractid,ou,desktop').set('user');
	db.err('error-invalid-accesstoken');
	db.callback(function(err, response) {

		if (err) {
			self.invalid(err);
			return;
		}

		var user = response.user;

		if (user.inactive) {
			self.invalid('error-inactive');
			return;
		}

		if (user.blocked) {
			self.invalid('error-blocked');
			return;
		}

		var usage = {};
		var usageid = NOW.format('yyyyMMdd') + data.id;

		usage['+count'] = 1;
		usage['+' + (user.mobile ? 'mobile' : 'desktop')] = 1;
		usage['+' + (user.desktop === 1 ? 'windowed' : user.desktop === 2 ? 'tabbed' : 'desktop')] = 1;
		usage['+' + (user.darkmode === 1 ? 'darkmode' : 'lightmode')] = 1;
		usage.dtupdated = NOW;

		var db = DBMS();
		db.mod('tbl_usage_oauth', usage, true).where('id', usageid).insert(usage_oauth_insert, { id: usageid, oauthid: data.id });
		db.mod('tbl_oauth', { dtused: NOW }).where('id', data.id);

		user.blocked = undefined;
		user.inactive = undefined;

		if (response.oauth.allowreadprofile !== 2) {
			user.email = undefined;
			user.phone = undefined;
			user.repo = undefined;
			user.dtbirth = undefined;
		}

		self.json(user);
	});
}

function accesstoken(token) {

	if (!CONF.allowaccesstoken) {
		self.invalid('error-noaccesstoken');
		return;
	}

	var app = MAIN.apps.findItem('accesstoken', token);
	var self = this;
	if (!app) {
		self.throw401();
		return;
	}

	var url = self.query.url || app.frame;
	self.id = app.id;

	$WORKFLOW('Apps', 'run', function(err, response) {

		var builder = [];
		builder.push('openplatform=' + encodeURIComponent(response.verify));

		if (response.rev)
			builder.push('rev=' + response.rev);

		if (self.user.language)
			builder.push('language=' + self.user.language);

		var index = url.indexOf('?');
		if (index === -1)
			url += '?';
		else
			url += '&';

		self.redirect(url + builder.join('&'));
	}, self);
}

function login() {

	var self = this;

	if (self.req.locked) {
		// locked
		self.view('locked');
		return;
	}

	if (self.query.token) {
		var data = DECRYPT(self.query.token, CONF.secretpassword);
		if (data && data.date && data.date.add('2 days') > NOW) {
			FUNC.cookie(self, data.id, null, function() {
				self.redirect(self.url + (data.type === 'password' ? '?password=1' : '?welcome=1'));
			}, (self.headers['user-agent'] || '').parseUA() + ' ({0})'.format(self.ip));
			return;
		}
	}

	if (self.url !== '/')
		self.status = 401;

	self.view('login');
}

function logout() {
	var self = this;
	if (self.user)
		FUNC.logout(self);
	else
		self.redirect('/');
}

function lock() {
	var self = this;
	MAIN.session.get(self.sessionid, function(err, profile, meta) {
		if (meta) {
			meta.settings = (meta.settings || '').replace('locked:0', 'locked:1');
			if (meta.settings.indexOf('locked:1') === -1)
				meta.settings = (meta.settings ? ';' : '') + 'locked:1';
			var expire = CONF.cookie_expiration || '3 days';
			MAIN.session.set(meta.sessionid, meta.id, profile, expire, meta.note, meta.settings);
		}
		self.redirect('/');
	});
}

function process404() {

	var self = this;

	if (self.url.indexOf('/photos/') !== -1 && self.url.lastIndexOf('.jpg') !== -1) {
		self.file('/img/photo.jpg');
		return;
	}

	self.status = 404;
	self.plain('404: The resource not found');
}