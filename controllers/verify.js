const ERR_INVALID = 'Invalid token';

exports.install = function() {

	// 3rd party apps
	ROUTE('GET    /verify/', verify);
	ROUTE('POST   /notify/', notify);
	ROUTE('GET    /session/', session);

};

async function verify() {

	var $ = this;
	var reqtoken = $.query.token;
	var restoken = $.headers['x-token'];

	$.status = 401;

	var index = reqtoken.lastIndexOf('~');
	var sign = reqtoken.substring(index + 1);

	reqtoken = reqtoken.substring(0, index);

	if (!restoken || !reqtoken) {
		$.invalid('Invalid token');
		return;
	}

	// Internal in-memory cache
	if (MAIN.cache[reqtoken]) {
		$.status = 200;
		$.content(MAIN.cache[reqtoken], 'application/json');
		return;
	}

	var reqarr = reqtoken.split('X');
	if (FUNC.checksum(reqarr[0] + 'X' + reqarr[1]) !== reqtoken) {
		$.invalid(ERR_INVALID);
		return;
	}

	var db = DB();
	var session = await db.read('op.tbl_app_session').id(reqarr[0]).error('Invalid token session').promise($);

	if (session.reqtoken !== sign || session.restoken !== restoken) {
		$.invalid(ERR_INVALID);
		return;
	}

	var app = await db.read('op.tbl_app').fields('id,allow,reqtoken,restoken').id(session.appid).error('Invalid token session').promise($);
	if (app.allow && app.allow.length) {
		if (!app.allow.includes($.ip)) {
			$.invalid('Not allowed IP address');
			return;
		}
	}

	var user = await db.read('op.tbl_user').fields('id,email,name,photo,sa,gender,reference,language,color,interface,darkmode,sounds,notifications,dtbirth,dtcreated,dtupdated,isonline,isdisabled,isinactive').id(session.userid).where('isremoved=FALSE').error('User not found').promise($);

	if (user.isdisabled) {
		$.invalid('User has been disabled');
		return;
	}

	if (user.isinactive) {
		$.invalid('User is inactive');
		return;
	}

	var userappid = user.id + app.id;
	var userapp = await db.read('op.tbl_user_app').fields('notify').id(userappid).promise();

	if (!userapp) {
		userapp = FUNC.makenotify(app, user.id);
		userapp.id = userappid;
		userapp.appid = session.appid;
		userapp.userid = user.id;
		await db.insert('op.tbl_user_app', userapp).promise();
	}

	if (!userapp.notify) {
		userapp = FUNC.makenotify(app, user.id);
		userapp.dtupdated = NOW;
		await db.modify('op.tbl_user_app', userapp).id(userappid).promise();
	}

	// Clean useless fields
	user.isinactive = undefined;
	user.isdisabled = undefined;
	user.isonline = undefined;

	if (user.photo)
		user.photo = CONF.url + user.photo;

	if (!user.language)
		user.language = CONF.language;

	FUNC.permissions(user.id, function(data) {

		user.openplatformid = CONF.id;
		user.openplatform = CONF.url;
		user.ssid = FUNC.checksum(session.id + 'X' + session.sessionid);

		if (user.notifications)
			user.notify = userapp.notify;

		user.permissions = data.permissions[app.id] || EMPTYARRAY;
		user.groups = data.groups;

		// Compress data
		for (var key in user) {
			var val = user[key];
			if (val == null || val === '')
				user[key] = undefined;
		}

		MAIN.cache[reqtoken] = JSON.stringify(user);
		$.status = 200;
		$.content(MAIN.cache[reqtoken], 'application/json');
	});
}

async function notifygroup($) {
	var data = CONVERT($.body, 'app:String,group:String,permission:String');
	var db = DATA;

	var app,userapp,users;

	// App notify
	if(data.app) {
		app = await db.read('op.tbl_app').where('name', data.app).fields('id,allow,name,icon,color').promise($);

		if(!app) {
			$.invalid('@(Invalid app)');
			return;
		}

		if (app.allow && app.allow.length && app.allow.indexOf($.ip) === -1) {
			MAIN.cache[reqtokenerr] = 'Not allowed IP address';
			$.invalid(MAIN.cache[reqtokenerr]);
			return;
		}

		userapp = await db.find('op.tbl_user_app').fields('userid,appid,notifytoken,notifications').where('appid', app.id).promise($);
		var usersid = userapp.map(i=> { return i.userid; });
		users = await db.find('op.tbl_user').fields('id,name,email').in('id', usersid).promise($);
	}

	// Group Notify
	if(data.group) {
		var group = await db.read('op.tbl_group').where('name', data.group).fields('id,name,icon,color').promise($);

		if(!group || group.isdisabled) {
			$.invalid('@(Invalid group)');
			return;
		}

		if (!group.icon)
			group.icon = 'ti ti-bullhorn';
		group.name = TRANSLATOR(DEF.onLocale($.req), '@(To Group)') + ': ' + group.name;
		app = group;

		var groupusers = await db.find('op.tbl_user_group').fields('userid').where('groupid', group.id).promise($);
		var usersid = groupusers.map(i=> { return i.userid; });
		userapp = await db.query('SELECT DISTINCT ON (userid) userid,appid,notifytoken,notifications FROM op.tbl_user_app WHERE userid IN ({0}) AND notifications is TRUE;'.format(PG_ESCAPE(usersid))).promise($);
		users = await db.find('op.tbl_user').fields('id,name,email').in('id', usersid).promise($);
	}

	// Role Notify
	if(data.permission) {
		var permission = await db.read('op.tbl_app_permission').fields('id,name,appid').where('name', data.permission).promise($);

		if(!permission) {
			$.invalid('@(Invalid permission name)');
			return;
		}

		permission.icon = 'ti ti-bullhorn';
		permission.name = TRANSLATOR(DEF.onLocale($.req), '@(To role)') + ': ' + permission.name;
		app = permission;

		userapp = await db.find('op.tbl_user_app').fields('userid,appid,notifytoken,notifications').where('appid', permission.appid).where('notifications', 't').promise($);
		var usersid = userapp.map(i=> { return i.userid; });
		users = await db.find('op.tbl_user').fields('id,name,email').in('id', usersid).promise($);
	}

	if (userapp.length) {
		for (var i = 0; i < userapp.length; i++) {
			var user = users.findItem('id', userapp[i].userid);

			userapp[i].user = user.name;
			userapp[i].email = user.email;
			userapp[i].name = app.name;
			userapp[i].icon = app.icon;
			userapp[i].color = app.color;

			$.status = 200;
			userapp[i].notifytoken = undefined;
			//MAIN.cache[reqtoken] = userapp[i];
			id = makenotification($, db, userapp[i]);
		}
		$.success(app.id);
	} else
		$.invalid('@(Invalid data)');
}

async function notify() {

	var $ = this;
	var reqtoken = $.query.token;
	var restoken = $.headers['x-token'];
	var id;

	$.status = 401;

	if (!restoken || !reqtoken) {
		$.invalid(ERR_INVALID);
		return;
	}

	if (MAIN.cache[reqtoken]) {
		$.status = 200;
		id = makenotification($, DB(), MAIN.cache[reqtoken]);
		$.success(id);
		return;
	}

	var reqtokenerr = 'err' + reqtoken;

	if (MAIN.cache[reqtokenerr]) {
		$.invalid(MAIN.cache[reqtokenerr]);
		return;
	}

	var reqarr = reqtoken.split('X');

	if (FUNC.checksum(reqarr[0] + 'X' + reqarr[1]) !== reqtoken) {
		MAIN.cache[reqtokenerr] = ERR_INVALID;
		$.invalid(ERR_INVALID);
		return;
	}

	// If notify meta includes group, app or permission then execute notifygroup.
	if ($.body.group || $.body.permission || $.body.app) {
		var notifications = await notifygroup($);
		return notifications;
	}

	var db = DB();
	var userapp = await db.read('op.tbl_user_app').fields('userid,appid,notifytoken,notifications').id(reqarr[0]).promise($);

	if (!userapp || restoken !== userapp.notifytoken) {
		MAIN.cache[reqtokenerr] = ERR_INVALID;
		$.invalid(ERR_INVALID);
		return;
	}

	if (!userapp.notifications) {
		MAIN.cache[reqtokenerr] = 'Not allowed notifications';
		$.invalid(MAIN.cache[reqtokenerr]);
		return;
	}

	var user = await db.read('op.tbl_user').fields('name,email,notifications,isremoved,isconfirmed,isdisabled,isinactive').id(userapp.userid).promise($);

	if (!user || user.isremoved || !user.isconfirmed || user.isdisabled || user.isinactive) {
		MAIN.cache[reqtokenerr] = ERR_INVALID;
		$.invalid(ERR_INVALID);
		return;
	}

	if (!user.notifications) {
		MAIN.cache[reqtokenerr] = 'Not allowed notifications';
		$.invalid(MAIN.cache[reqtokenerr]);
		return;
	}

	var app = await db.read('op.tbl_app').id(userapp.appid).fields('allow,name,icon,color').promise();
	if (app.allow && app.allow.length && app.allow.indexOf($.ip) === -1) {
		MAIN.cache[reqtokenerr] = 'Not allowed IP address';
		$.invalid(MAIN.cache[reqtokenerr]);
		return;
	}

	userapp.user = user.name;
	userapp.email = user.email;
	userapp.name = app.name;
	userapp.icon = app.icon;
	userapp.color = app.color;

	$.status = 200;
	userapp.notifytoken = undefined;
	MAIN.cache[reqtoken] = userapp;
	id = makenotification($, db, userapp);
	if (id)
		$.success(id);
	else
		$.invalid('@(Invalid data)');
}

function makenotificationunread(user) {
	user.unread++;
}

NEWPUBLISH('Notifications.create', 'id,userid,appid,body,path,app,user,email,color,icon,dtcreated');

async function makenotification($, db, userapp) {

	var data = CONVERT($.body, 'body:String, path:String, icon:Icon, color:Color');
	var model = {};

	model.id = UID();
	model.userid = userapp.userid;
	model.appid = userapp.appid;
	model.body = data.body || '';
	model.path = data.path;
	model.name = userapp.name;
	model.color = data.color || userapp.color;
	model.icon = data.icon || userapp.icon;
	model.dtcreated = NOW = new Date();

	await db.insert('op.tbl_notification', model).promise();

	if (model.body)
		await db.query('UPDATE op.tbl_user SET unread=unread+1 WHERE id={0}'.format(PG_ESCAPE(userapp.userid))).promise();

	MAIN.auth.update(model.userid, makenotificationunread);

	if (CONF.allow_tms) {
		model.app = model.name;
		model.user = userapp.name;
		model.email = userapp.email;
		model.name = undefined;
		PUBLISH('Notifications.create', model);
	}

	return model.id;
}

async function session() {

	var $ = this;
	var session = $.query.ssid || $.query.openplatformid || $.query.token || $.query.session;

	if (!session) {
		$.invalid('@(Invalid token)');
		return;
	}

	var arr = session.split('X');

	if (FUNC.checksum(arr[0] + 'X' + arr[1]) !== session) {
		$.invalid('@(Invalid token)');
		return;
	}

	var user = await DB().query('SELECT b.id,b.language,b.name,b.color,b.sa,a.isonline FROM op.tbl_session a INNER JOIN op.tbl_user b ON b.id=a.userid AND b.isremoved=FALSE AND b.isdisabled=FALSE AND b.isinactive=FALSE WHERE a.id={0} AND dtexpire>=NOW()'.format(PG_ESCAPE(arr[1]))).first().promise($);
	if (user)
		$.json(user);
	else
		$.invalid('@(Invalid token)');
}
