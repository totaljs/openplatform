// DB
require('dbms').init(CONF.database, ERROR('DBMS'));

// Constants
const Path = require('path');
const Fs = require('fs');
const DB_LOGGED = { online: true };
const DDOS_MAX_ATTEMPS = 10;

var OTP = {};
var OTPCOUNT = 0;
var SIMPLECACHE = {};
var DDOS = {};
var ORIGINERRORS = {};

MAIN.id = 0;                   // Current ID of OpenPlatform
MAIN.version = 4900;           // Current version of OpenPlatform
// MAIN.guest                  // Contains a guest user instance
// MAIN.apps                   // List of all apps
// MAIN.roles                  // List of all roles (Array)
// MAIN.rolescache             // List of all roles (Object)
// MAIN.groups                 // List of all groups (Array)
// MAIN.groupscache            // List of all groups (Object)

MAIN.meta = {};
MAIN.metadirectories = {};

// Temporary
var USERS = {};

MAIN.logout = function(controller) {
	if (CONF.oauthopenplatform)
		controller.redirect(CONF.oauthopenplatform + '/logout/');
	else
		controller.redirect('/');
};

MAIN.readuser = readuser;

DBMS.audit(function($, data, message) {

	var model = {};
	model.type = $.ID;
	model.userid = $.user ? $.user.id : null;
	model.username = $.user ? $.user.name : '';
	model.message = message;

	if ($.headers)
		model.ua = $.ua || ($.headers['user-agent'] || '').toString(30);

	if ($.id)
		model.rowid = $.id.substring(50);

	model.ip = $.ip;
	model.dtcreated = NOW = new Date();

	if (data) {
		data.password = undefined;
		data.screenshot = undefined;
		model.data = JSON.stringify(data);
	}

	this.insert('tbl_log', model).nobind();
});

FUNC.loginid = function(controller, userid, callback, note) {
	FUNC.cookie(controller, userid, callback, note);
};

FUNC.clearcache = function(userid) {
	delete USERS[userid];
};

FUNC.loginotp = function(login, code, callback) {

	var meta = OTP[login];
	if (meta == null) {
		callback('error-otp-session', null);
		return;
	}

	if (MODULE('totp').totpverify(meta.otpsecret, code) != null) {
		OTPCOUNT--;
		delete OTP[login];
		callback(null, meta.id);
	} else
		callback('error-otp-code');
};

FUNC.nicknamesanitize = function(value) {
	var builder = [];
	for (var i = 0; i < value.length; i++) {
		var c = value.charCodeAt(i);
		if ((c < 48 && c !== 32) || (c > 57 && c < 65) || (c > 90 && c < 97) || (c > 123 && c < 128))
			continue;
		if (c === 32 && value.charCodeAt(i + 1) === 32)
			continue;
		builder.push(value[i]);
	}
	return builder.join('');
};

FUNC.login = function(login, password, callback) {

	var db = DBMS();
	var builder = db.read('tbl_user');

	if (!FUNC.customlogin)
		builder.fields('id,password,otp,otpsecret,repo,dn');

	builder.query('login=$1', [login]);

	var done = function(err, id, response) {

		if (err || !id) {
			callback(err);
			return;
		}

		if (response.otp) {
			if (!OTP[login])
				OTPCOUNT++;
			OTP[login] = { date: NOW.add('2 minutes'), id: response.id, otpsecret: response.otpsecret };
			callback(null, 'otp');
			return;
		}

		callback(err, id);
	};

	builder.callback(function(err, response) {

		if (response) {
			if (FUNC.customlogin) {
				FUNC.customlogin(login, password, response, (err, is) => done(err, !err && is ? response.id : null, response));
				return;
			} else if (CONF.ldap_active && response.dn) {
				var opt = {};
				opt.ldap = FUNC.ldap_host();
				opt.user = response.dn;
				opt.password = password;
				LDAP(opt, function(err, profile) {
					if (profile)
						done(null, response.id, response);
					else
						callback();
				});
				return;
			} else if (response.password === password.hash(CONF.hashmode || 'sha256', CONF.hashsalt)) {
				done(null, response.id, response);
				return;
			}
		}
		callback();
	});
};

FUNC.logout = function(controller) {

	if (controller.sessionid) {
		var db = DBMS();
		db.remove('tbl_user_session').id(controller.sessionid);
		controller.ID = 'Logout';
		db.log(controller);
		MAIN.session.logout(controller);
	} else if (controller.user && controller.user.guest)
		controller.cookie(MAIN.session.cookie, '', '-1 day');

	MAIN.logout(controller);
};

FUNC.cookie = function(controller, user, sessionid, callback, note) {

	if (typeof(sessionid) === 'function') {
		note = callback;
		callback = sessionid;
		sessionid = null;
	}

	var id;

	if (typeof(user) === 'string') {
		id = user;
		user = null;
	} else
		id = user.id;

	DB_LOGGED.verifytoken = GUID(15);

	var expiration = CONF.cookie_expiration || '3 days';

	if (!sessionid)
		sessionid = UID();

	var db = DBMS();
	db.insert('tbl_user_session', { id: sessionid, userid: id, dtcreated: NOW, ip: controller.ip, ua: controller.ua, referrer: note, dtexpire: NOW.add(expiration) });
	db.modify('tbl_user', DB_LOGGED).id(id);

	db.callback(function() {
		MAIN.session.authcookie(controller, sessionid, id, expiration);
		MAIN.session.refresh(id);
		callback();
	});
};

// Returns a user profile object
FUNC.profile = function(user, callback) {

	var meta = {};
	meta.openplatformid = MAIN.id;
	meta.version = MAIN.version;
	meta.name = user.name;
	meta.photo = user.photo;
	meta.locality = user.locality;
	meta.ou = user.ou;
	meta.company = user.company;
	meta.sa = user.sa;
	meta.apps = [];
	meta.countnotifications = user.countnotifications;
	meta.sounds = user.sounds;
	meta.statusid = user.statusid;
	meta.volume = user.volume;
	meta.darkmode = user.darkmode;
	meta.colorscheme = user.colorscheme || CONF.colorscheme;
	meta.timeformat = user.timeformat;
	meta.dateformat = user.dateformat;
	meta.numberformat = user.numberformat;
	meta.language = user.language;
	meta.desktop = user.desktop;
	meta.repo = user.repo;
	meta.rev = user.rev;
	meta.profileid = user.profileid;

	if (user.guest)
		meta.guest = true;

	meta.team = user.team ? user.team.length : 0;
	meta.member = user.member ? user.member.length : 0;

	var bg = user.background || CONF.background;
	if (bg)
		meta.background = bg;

	if (CONF.mode !== 'prod')
		meta.test = true;

	meta.mode = CONF.mode;
	meta.status = user.status;

	if (user.directory)
		meta.directory = user.directory;

	meta.directoryid = user.directoryid || 0;

	for (var i = 0; i < MAIN.apps.length; i++) {
		var app = MAIN.apps[i];
		var userapp = user.apps[app.id];
		if (app && !app.blocked && userapp)
			meta.apps.push({ id: app.id, favorite: userapp.favorite, icon: app.icon, title: app.titles ? (app.titles[user.language] || app.title) : app.title, name: app.name, online: app.online, version: app.version, linker: app.linker, notifications: userapp.notifications !== false, sounds: userapp.sounds !== false, responsive: app.responsive, countnotifications: userapp.countnotifications, countbadges: userapp.countbadges, width: app.width, height: app.height, screenshots: app.screenshots == true, resize: app.resize == true, type: app.type, mobilemenu: app.mobilemenu !== false, position: userapp.position == null ? app.position : userapp.position, color: app.color });
	}

	CONF.welcome && meta.apps.push({ id: '_welcome', icon: 'flag', title: TRANSLATOR(user.language, '@(Welcome)'), name: 'Welcome', online: true, internal: true, linker: CONF.welcome, width: 800, height: 600, resize: false, mobilemenu: false, position: 1000 });

	if (user.sa)
		meta.apps.push({ id: '_admin', icon: 'cog', title: TRANSLATOR(user.language, '@(Control panel)'), name: 'Admin', online: true, internal: true, linker: '_admin', width: 1280, height: 960, resize: true, mobilemenu: true, position: 1001 });

	/*
	if (!user.guest)
		meta.apps.push({ id: '_account', icon: 'user-circle', title: TRANSLATOR(user.language, '@(Account)'), name: 'Account', online: true, internal: true, linker: '_account', width: 550, height: 800, resize: false, mobilemenu: false });*/

	callback(null, meta);
};

// Return user profile object
FUNC.profilelive = function(user) {

	var meta = {};

	meta.name = user.name;
	meta.photo = user.photo;
	meta.sa = user.sa;
	meta.apps = [];
	meta.countnotifications = user.countnotifications;
	meta.sounds = user.sounds;
	meta.statusid = user.statusid;
	meta.status = user.status;
	meta.volume = user.volume;
	meta.darkmode = user.darkmode;
	meta.desktop = user.desktop;
	meta.colorscheme = user.colorscheme || CONF.colorscheme;
	meta.repo = user.repo;
	meta.rev = user.rev;

	if (user.locking)
		meta.locking = user.locking;

	if (user.guest)
		meta.guest = true;

	var bg = user.background || CONF.background;
	if (bg)
		meta.background = bg;

	meta.mode = CONF.mode || 'test';

	if (user.status)
		meta.status = user.status;

	meta.apps = user.apps;
	return meta;
};

FUNC.reconfigure = function(callback) {
	DBMS().find('cl_config').fields('id,type,value').data(function(response) {
		for (var i = 0; i < response.length; i++) {
			var item = response[i];
			var val = item.value;
			switch (item.type) {
				case 'number':
					val = +val;
					break;
				case 'boolean':
					val = val === '1' || val === 'true';
					break;
				case 'date':
					val = val.parseDate();
					break;
				case 'object':
					val = JSON.parse(val);
					break;
			}

			if (item.id === 'smtpsettings') {
				item.id = 'mail_smtp_options';
				val = val.parseJSON();
			} else if (item.id === 'smtp')
				item.id = 'mail_smtp';
			else if (item.id === 'sender')
				item.id = 'mail_address_from';

			CONF[item.id] = val;
		}

		CONF.mail_smtp && Mail.use(CONF.mail_smtp, CONF.mail_smtp_options, ERROR('SMTP server'));
		MAIN.id = CONF.url.crc32(true);
		callback && callback();
		EMIT('configure');
	});
};

// Output see the app only
FUNC.meta = function(app, user, serverside) {

	if (!user.apps || !user.apps[app.id])
		return null;

	var meta = { date: NOW, ip: user.ip, url: app.frame, id: app.id };
	var token = FUNC.encodeauthtoken(app, user);
	var tokenapp = FUNC.encodetoken(app, user);

	if (!serverside) {
		meta.accesstoken = token;
		meta.verify = CONF.url + '/api/verify/?accesstoken=' + token;
		meta.rev = user.rev;
	}

	if (serverside) {
		meta.openplatform = CONF.url;
		meta.openplatformid = MAIN.id;

		if (CONF.email)
			meta.email = CONF.email;

		if (CONF.verifytoken)
			meta.verifytoken = CONF.verifytoken;
	}

	meta.name = CONF.name;
	meta.version = MAIN.version;

	// meta.colorscheme = CONF.colorscheme;
	// meta.background = CONF.background;

	if (app.serververify && !serverside) {
		var tmp = FUNC.makeprofile(user, app.allowreadprofile, app);
		meta.serververify = true;
		meta.profile = {};
		meta.profile.badge = tmp.badge;
		meta.profile.notify = tmp.notify;
		return meta;
	}

	if (app.allowreadprofile) {
		meta.profile = FUNC.makeprofile(user, app.allowreadprofile, app);
	} else {
		meta.profile = {};
		meta.profile.id = user.id;
		meta.profile.name = user.name;
		meta.profile.dateformat = user.dateformat;
		meta.profile.timeformat = user.timeformat;
		meta.profile.numberformat = user.numberformat;
		meta.profile.language = user.language;
	}

	if (user.repo)
		meta.profile.repo = user.repo;

	if (serverside) {

		if (app.sn)
			meta.sn = app.sn;

		meta.meta = CONF.url + '/api/meta/?accesstoken=' + tokenapp;

		if (app.allowreadapps)
			meta.apps = CONF.url + '/api/apps/?accesstoken=' + tokenapp;

		if (app.allowreadusers)
			meta.users = CONF.url + '/api/users/?accesstoken=' + tokenapp;

		meta.services = CONF.url + '/api/services/?accesstoken=' + tokenapp;

		if (app.settings)
			meta.settings = app.settings;

		if (app.services)
			meta.servicetoken = app.servicetoken;
	}

	return meta;
};

FUNC.metaguest = function() {
	var meta = { date: NOW };
	meta.openplatform = CONF.url;
	meta.openplatformid = MAIN.id;
	meta.name = CONF.name;
	meta.guest = true;
	meta.id = '0';

	if (CONF.email)
		meta.email = CONF.email;

	if (CONF.verifytoken)
		meta.verifytoken = CONF.verifytoken;

	meta.colorscheme = CONF.colorscheme;
	meta.background = CONF.background;
	meta.profile = CLONE(MAIN.guest);
	meta.profile.apps = meta.profile.accesstoken = meta.profile.verifytoken = undefined;
	return meta;
};

// Notifications + badges
FUNC.encodetoken = function(app, user) {
	var sign = app.id + '-' + user.id + '-' + (user.accesstoken + app.accesstoken).crc32(true);
	return sign + '-' + (sign + CONF.accesstoken).crc32(true);
};

FUNC.decodetoken = function($, callback) {

	if (DDOS[$.ip] > DDOS_MAX_ATTEMPS) {
		$.invalid('error-blocked-ip');
		return;
	}

	var sign = $.query.accesstoken;
	if (!sign || sign.length < 30) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.invalid('error-invalid-accesstoken');
		return;
	}

	if (SIMPLECACHE[sign]) {
		callback(SIMPLECACHE[sign]);
		return;
	}

	var arr = sign.split('-');
	if (arr.length !== 4) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.invalid('error-invalid-accesstoken');
		return;
	}

	var tmp = (arr[0] + '-' + arr[1] + '-' + arr[2] + CONF.accesstoken).crc32(true) + '';
	if (tmp !== arr[3]) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.invalid('error-invalid-accesstoken');
		return;
	}

	var app = MAIN.apps.findItem('id', arr[0]);
	var user = USERS[arr[1]];

	if (!app) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.model = { url: $.req.url, headers: $.req.headers };
		FUNC.log('Error/Token', arr[0], 'FUNC.decodetoken:app==null', $);
		$.invalid('error-invalid-accesstoken');
		return;
	}

	if (user) {
		var tmp = (user.accesstoken + app.accesstoken).crc32(true) + '';
		if (tmp === arr[2]) {
			var obj = { app: app, user: user };
			if (FUNC.unauthorized(obj, $)) {
				DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
			} else {
				SIMPLECACHE[sign] = obj;
				callback(obj);
			}
		} else {
			DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
			$.invalid('error-invalid-accesstoken');
		}
	} else {
		// reads user from DB
		readuser(arr[1], function(err, user) {
			if (user) {
				var tmp = (user.accesstoken + app.accesstoken).crc32(true) + '';
				if (tmp === arr[2]) {
					var obj = { app: app, user: user };
					if (FUNC.unauthorized(obj, $)) {
						DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
					} else {
						SIMPLECACHE[sign] = obj;
						callback(obj);
					}
				} else {
					$.invalid('error-invalid-accesstoken');
					DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
				}
			} else {
				DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
				$.invalid('error-invalid-accesstoken');
			}
		});
	}
};

function checkorigin(origins, ip) {

	for (var i = 0; i < origins.length; i++) {
		var o = origins[i];
		if (ip.substring(0, o.length) === o)
			return i;
	}

	return -1;
}

FUNC.unauthorized = function(obj, $) {
	var app = obj.app;
	var user = obj.user;

	if (app.origintoken) {
		var token = $.headers['x-origin'];
		if (token !== app.origintoken) {
			$.invalid('error-invalid-origin');
			if (!ORIGINERRORS[$.ip]) {
				FUNC.log('Error/Origin', null, app.name + ':' + app.origintoken + ' != ' + token);
				ORIGINERRORS[$.ip] = 1;
			}
			return true;
		}
	} else if (app.origin && app.origin.length) {
		if (checkorigin(app.origin, $.ip) == -1 && app.hostname !== $.ip && (!$.user || $.user.id !== user.id)) {
			if (!ORIGINERRORS[$.ip]) {
				FUNC.log('Error/Origin', null, app.name + ':' + app.hostname + ' != ' + $.ip);
				ORIGINERRORS[$.ip] = 1;
			}
			$.invalid('error-invalid-origin');
			return true;
		}
	} else if (app.hostname !== $.ip && (!$.user || $.user.id !== user.id)) {
		if (!ORIGINERRORS[$.ip]) {
			FUNC.log('Error/Origin', null, app.name + ':' + app.hostname + ' != ' + $.ip);
			ORIGINERRORS[$.ip] = 1;
		}
		$.invalid('error-invalid-origin');
		return true;
	}

	if (user.blocked || user.inactive) {
		$.invalid('error-accessible');
		return true;
	}
};

FUNC.notadmin = function($) {
	if ($.user && !$.user.sa) {
		$.invalid('error-permissions');
		return true;
	}
};

// Auth token
FUNC.encodeauthtoken = function(app, user) {
	var sign = app.id + '-' + user.id;
	sign += '-' + ((user.accesstoken + app.accesstoken).crc32(true) + '' + (app.id + user.id + user.verifytoken + CONF.accesstoken).crc32(true));
	return sign.encrypt(CONF.accesstoken.substring(0, 20));
};

FUNC.decodeauthtoken = function($, callback) {

	if (DDOS[$.ip] > DDOS_MAX_ATTEMPS) {
		$.invalid('error-blocked-ip');
		return;
	}

	var sign = $.query.accesstoken;

	if (!sign || sign.length < 30) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.invalid('error-invalid-accesstoken');
		return;
	}

	if (SIMPLECACHE[sign]) {
		callback(SIMPLECACHE[sign]);
		return;
	}

	sign = sign.decrypt(CONF.accesstoken.substring(0, 20));

	if (!sign) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.invalid('error-invalid-accesstoken');
		return;
	}

	var arr = sign.split('-');
	if (arr.length !== 3)
		return null;

	var app = MAIN.apps.findItem('id', arr[0]);

	if (!app) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		$.invalid('error-invalid-accesstoken');
		return;
	}

	var user = USERS[arr[1]];
	if (user) {

		var tmp = (user.accesstoken + app.accesstoken).crc32(true) + '' + (app.id + user.id + user.verifytoken + CONF.accesstoken).crc32(true);
		if (tmp === arr[2]) {
			var obj = { app: app, user: user };
			if (FUNC.unauthorized(obj, $)) {
				DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
			} else {
				SIMPLECACHE[sign] = obj;
				callback(obj);
			}
		} else {
			DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
			$.invalid('error-invalid-accesstoken');
		}

	} else {

		// reads user from DB
		readuser(arr[1], function(err, user) {
			if (user) {
				var tmp = (user.accesstoken + app.accesstoken).crc32(true) + '' + (app.id + user.id + user.verifytoken + CONF.accesstoken).crc32(true);
				if (tmp === arr[2]) {
					var obj = { app: app, user: user };
					if (FUNC.unauthorized(obj, $)) {
						DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
					} else {
						SIMPLECACHE[sign] = obj;
						callback(obj);
					}
				} else {
					DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
					$.invalid('error-invalid-accesstoken');
				}
			} else {
				DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
				$.invalid('error-invalid-accesstoken');
			}
		}, true);
	}
};

FUNC.makeapp = function(app, type) {

	// type 1: basic info
	// type 2: all info

	var obj = {};
	obj.id = app.id;
	obj.title = app.title;
	obj.allowreadapps = app.allowreadapps;
	obj.allowreadusers = app.allowreadusers;
	obj.allowreadmeta = app.allowreadmeta;
	obj.allownotifications = app.allownotifications;
	obj.responsive = app.responsive;
	obj.icon = app.icon;
	obj.color = app.color;
	obj.description = app.description;
	obj.name = app.name;
	obj.title = app.title;
	obj.version = app.version;
	obj.online = app.online;
	obj.dtsync = app.dtsync;
	obj.dtcreated = app.dtcreated;
	obj.author = app.author;
	obj.type = app.type;
	obj.mobilemenu = app.mobilemenu;
	obj.services = app.services ? Object.keys(app.services) : [];

	switch (type) {
		case 2:
			obj.url = app.url;
			obj.frame = app.frame;
			obj.roles = app.roles;
			obj.email = app.email;
			obj.custom = app.custom;
			obj.origin = app.origin;
			break;
	}

	return obj;
};

FUNC.makeprofile = function(user, type, app, fields) {

	// type 1: basic info
	// type 2: all info
	// type 3: app users - basic info
	// type 4: app users - all info

	// if (type > 2 && (!user.apps || !user.apps[app.id]) || user.inactive)
	if (type > 2 && user.inactive)
		return;

	var obj = {};

	if (!fields || fields.id)
		obj.id = user.id;

	if (!fields || fields.oauth2)
		obj.oauth2 = user.oauth2;

	if (user.supervisorid && (!fields || fields.supervisorid))
		obj.supervisorid = user.supervisorid;

	if (user.deputyid && (!fields || fields.deputyid))
		obj.deputyid = user.deputyid;

	if (!fields || fields.directory) {
		if (user.directory) {
			obj.directory = user.directory;
			obj.directoryid = user.directoryid;
		} else
			obj.directoryid = 0;
	}

	if (!fields || fields.statusid)
		obj.statusid = user.statusid;

	if (user.status && (!fields || fields.status))
		obj.status = user.status;

	if (user.blocked && (!fields || fields.blocked))
		obj.blocked = user.blocked;

	if (user.company && (!fields || fields.company))
		obj.company = user.company;

	if (user.groupid && (!fields || fields.groupid))
		obj.groupid = user.groupid;

	if (user.dtbirth && (!fields || fields.dtbirth))
		obj.dtbirth = user.dtbirth;

	if (user.dtcreated && (!fields || fields.dtcreated))
		obj.dtcreated = user.dtcreated;

	if (user.dtend && (!fields || fields.dtend))
		obj.dtend = user.dtend;

	if (user.dtbeg && (!fields || fields.dtbeg))
		obj.dtbeg = user.dtbeg;

	if (user.dtupdated && (!fields || fields.dtupdated))
		obj.dtupdated = user.dtupdated;

	if (user.firstname && (!fields || fields.firstname))
		obj.firstname = user.firstname;

	if (user.lastname && (!fields || fields.lastname))
		obj.lastname = user.lastname;

	if (user.middlename && (!fields || fields.middlename))
		obj.middlename = user.middlename;

	if (user.name && (!fields || fields.name))
		obj.name = user.name;

	if (user.gender && (!fields || fields.gender))
		obj.gender = user.gender;

	if (user.language && (!fields || fields.language))
		obj.language = user.language;

	if (user.position && (!fields || fields.position))
		obj.position = user.position;

	if (user.meta && (!fields || fields.meta))
		obj.meta = user.meta;

	if (user.customer && (!fields || fields.customer))
		obj.customer = user.customer;

	if (!fields || fields.notifications)
		obj.notifications = user.notifications;

	if (!fields || fields.online)
		obj.online = user.online;

	if (user.photo && (!fields || fields.photo))
		obj.photo = CONF.url + '/photos/' + user.photo;

	if (user.locality && (!fields || fields.locality))
		obj.locality = user.locality;

	if (user.ou && (!fields || fields.ou))
		obj.ou = user.ou instanceof Array ? user.ou.join('/') : user.ou;

	if (user.dn && (!fields || fields.dn))
		obj.dn = user.dn;

	if (user.reference && (!fields || fields.locality))
		obj.reference = user.reference;

	if (user.dateformat && (!fields || fields.dateformat))
		obj.dateformat = user.dateformat;

	if (user.numberformat && (!fields || fields.numberformat))
		obj.numberformat = user.numberformat;

	if (user.timeformat && (!fields || fields.timeformat))
		obj.timeformat = user.timeformat;

	if (!fields || fields.countnotifications)
		obj.countnotifications = user.countnotifications || 0;

	if (!fields || fields.countbadges)
		obj.countbadges = user.countbadges || 0;

	if (!fields || fields.colorscheme)
		obj.colorscheme = user.colorscheme || CONF.colorscheme;

	if (!fields || fields.background)
		obj.background = user.background || CONF.background;

	if (!fields || fields.darkmode)
		obj.darkmode = user.darkmode;

	if (obj.background && (!fields || fields.background))
		obj.background = CONF.url + '/backgrounds/' + obj.background;

	if (!fields || fields.team)
		obj.team = user.team;

	if (!fields || fields.member)
		obj.member = user.member;

	if (!fields || fields.roles) {
		var appdata = user.apps ? user.apps[app.id] : null;
		var appsroles = appdata ? appdata.roles.slice(0) : user.appsroles ? user.appsroles.slice(0) : null;
		if (appsroles && user.roles && user.roles.length) {
			obj.roles = appsroles;
			for (var i = 0; i < user.roles.length; i++) {
				var role = user.roles[i];
				if (app.roles && app.roles.length && app.roles.indexOf(role) !== -1 && obj.roles.indexOf(role) === -1)
					obj.roles.push(role);
			}
		} else
			obj.roles = appsroles ? appsroles : EMPTYARRAY;
	}

	if (!fields || fields.groups)
		obj.groups = user.groups;

	if (user.sa && (!fields || fields.sa))
		obj.sa = user.sa;

	if (!fields || fields.sounds)
		obj.sounds = user.sounds;

	if (!fields || fields.volume)
		obj.volume = user.volume;

	var token;

	if (!fields || fields.badge || (obj.notifications && fields.notify))
		token = FUNC.encodetoken(app, user);

	if (!fields || fields.badge)
		obj.badge = CONF.url + '/api/badge/?accesstoken=' + token;

	if (obj.notifications && (!fields || fields.notify))
		obj.notify = CONF.url + '/api/notify/?accesstoken=' + token;

	if (type === 2 || type === 4) {
		if (!fields || fields.email)
			obj.email = user.email;

		if (!fields || fields.phone)
			obj.phone = user.phone;
	}

	return obj;
};

DEF.helpers.profile = function() {
	return JSON.stringify(FUNC.makeprofile(this.user, 1));
};

function getCleanValue(a, b, c) {
	if (a != null)
		return a;
	if (b != null)
		return b;
	return c;
}

FUNC.refreshapp = function(app, callback) {
	var checksum = app.checksum || '';
	RESTBuilder.GET(app.url).exec(function(err, response, output) {

		if (err || !response.url) {

			app.online = false;
			app.checksum = '';

		} else {

			var meta = CONVERT(response, 'name:String(30),description:String(100),color:String(8),icon:String(30),url:String(500),author:String(50),type:String(30),version:String(20),email:String(120),width:Number,height:Number,resize:Boolean,mobilemenu:Boolean,serververify:Boolean,reference:String(40),roles:[String],origin:[String],allowguestuser:Boolean,guestuser:Boolean,responsive:boolean');

			app.hostname = output.hostname.replace(/:\d+/, '');
			app.online = true;
			app.version = meta.version;
			app.name = meta.name;
			app.description = meta.description;
			app.author = meta.author;
			app.icon = meta.icon;
			app.frame = meta.url;
			app.email = meta.email;
			app.roles = meta.roles;
			app.color = meta.color;
			app.width = meta.width;
			app.height = meta.height;
			app.resize = meta.resize;
			app.type = meta.type;
			app.responsive = meta.responsive;
			app.mobilemenu = meta.mobilemenu;
			app.serververify = meta.serververify !== false;
			app.services = response.services || null;
			app.reference = meta.reference;
			app.allowguestuser = getCleanValue(meta.allowguestuser, meta.guestuser, false);

			if (meta.origin && meta.origin instanceof Array && meta.origin.length)
				app.origin = meta.origin;
			else
				app.origin = null;

			// Adds resolved origin
			// Only Total.js 4
			if (output.origin && output.origin.length) {

				if (!app.origin)
					app.origin = [];

				for (var i = 0; i < output.origin.length; i++) {
					var origin = output.origin[i];
					if (app.origin.indexOf(origin) === -1)
						app.origin.push(origin);
				}
			}

			var sign = (app.name + '' + app.icon + app.version + (app.color ? app.color : '') + (app.width || 0) + '' + (app.height || 0) + (app.resize ? '1' : '0') + app.type + (app.responsive ? '1' : '0') + (app.mobilemenu ? '1' : '0') + (app.serververify ? '1' : '0') + (app.allowreadapps ? '1' : '0') + (app.allowreadusers ? '1' : '0') + (app.allowreadprofile ? '1' : '0') + (app.allownotifications ? '1' : '0') + (app.allowreadmeta ? '1' : '0') + (app.origin ? (app.origin.join('') || '[]') : '[]') + (app.roles ? (app.roles.join('') || '[]') : '[]') + app.hostname + (app.services ? JSON.stringify(app.services) : '{}'));
			app.checksum = sign.crc32(true) + '';
		}

		app.dtsync = NOW;
		callback(err, app, checksum !== app.checksum);
	});
};

// Refreshes a guest apps
FUNC.refreshguest = function() {
	if (MAIN.guest) {
		MAIN.guest.apps = {};
		for (var i = 0; i < MAIN.apps.length; i++) {
			var app = MAIN.apps[i];
			if (app.guest && !app.blocked)
				MAIN.guest.apps[app.id] = { roles: [], countnotifications: 0, countbadges: 0 };
		}
	}
};

// Loads a guest info from the file
FUNC.loadguest = function(callback) {

	Fs.readFile(PATH.root('guest.json'), function(err, data) {

		if (err) {
			callback && callback();
			return;
		}

		var user = data.toString('utf8').parseJSON(true);
		if (user) {
			user.id = '0';
			user.verifytoken = '0';
			user.accesstoken = '0';
			user.sounds = true;
			user.dtcreated = new Date(2019, 5, 17, 23, 15, 0);
			user.dtupdated = null;
			user.dtlogged = NOW;
			user.online = true;
			user.guest = true;
			user.apps = {};

			delete user.sa;
			delete user.countnotifications;
			delete user.supervisorid;
			delete user.deputyid;
			delete user.ou;
			delete user.dn;
			delete user.ougroups;

			if (!user.company)
				user.company = undefined;

			if (!user.reference)
				user.reference = undefined;

			if (!user.dateformat)
				user.dateformat = 'yyyy-MM-dd';

			if (!user.timeformat)
				user.timeformat = 24;

			if (!user.numberformat)
				user.numberformat = 1;

			MAIN.guest = user;
			FUNC.refreshguest();
			callback && callback();
		}
	});
};

FUNC.refreshgroupsrolesdelay = function() {
	setTimeout2('refreshgroupsrolesdelay', FUNC.refreshgroupsroles, 2000);
};

// Repairs empty groups
FUNC.repairgroupsroles = function(callback) {
	DBMS().query('SELECT groups FROM tbl_user WHERE groupshash IS NULL OR groupshash=\'\' AND groups IS NOT NULL AND array_length(groups,1) IS NOT NULL GROUP BY groups').data(function(response) {

		if (!response) {
			callback && callback();
			return;
		}

		response.wait(function(item, next) {
			var arr = item.groups.slice(0);
			arr.sort();
			var groupshash = arr.join(',').crc32(true) + '';
			if (groupshash)
				DBMS().query('UPDATE tbl_user SET groupshash=\'{0}\' WHERE array_to_string("groups", \',\')=$1'.format(groupshash), [item.groups.join(',')]).callback(next);
			else
				next();

		}, callback);
	});
};


FUNC.refreshgroupsroles = function(callback) {

	var db = DBMS();
	db.query('SELECT id, name, note, dtcreated, dtupdated FROM tbl_group ORDER BY 2').set('groups');
	db.query('SELECT id, name FROM cl_role ORDER BY 2').set('roles');
	db.query('SELECT id, groupid, appid, roles FROM tbl_group_app ORDER BY 2').set('appsroles');
	db.callback(function(err, response) {

		MAIN.groupscache = {};
		MAIN.rolescache = {};
		MAIN.groups = [];
		MAIN.roles = [];
		MAIN.meta.groups = [];

		for (var i = 0; i < response.groups.length; i++) {
			var item = response.groups[i];
			var obj = { id: item.id, name: item.name, note: item.note, dtcreated: item.dtcreated, dtupdated: item.dtupdated, appsroles: {} };
			MAIN.groupscache[item.id] = obj;
			MAIN.groups.push(obj);
			MAIN.meta.groups.push({ id: item.id, name: item.name });
		}

		for (var i = 0; i < response.appsroles.length; i++) {
			var item = response.appsroles[i];
			var group = MAIN.groupscache[item.groupid];
			if (!group.appsroles[item.appid])
				group.appsroles[item.appid] = [];
			group.appsroles[item.appid].push.apply(group.appsroles[item.appid], item.roles);
		}

		for (var i = 0; i < MAIN.groups.length; i++) {
			var group = MAIN.groups[i];
			group.apps = group.appsroles ? Object.keys(group.appsroles) : EMPTYARRAY;
		}

		for (var i = 0; i < response.roles.length; i++) {
			var item = response.roles[i];
			var obj = { id: item.id, name: item.name };
			MAIN.roles.push(obj);
			MAIN.rolescache[item.id] = obj;
		}

		// Clean apps
		DBMS().query('SELECT groups, COUNT(1)::int4 as count FROM tbl_user GROUP BY groups').callback(function(err, response) {

			var groupshashes = {};

			response.wait(function(item, next) {

				if (item.groups)
					item.groups.sort();
				else
					item.groups = [];

				var groupshash = item.groups.join(',').crc32(true) + '';
				groupshashes[groupshash] = 1;

				if (groupshash == 0) {
					DBMS().query('DELETE FROM tbl_user_app WHERE inherited=TRUE AND userid IN (SELECT tbl_user.id FROM tbl_user WHERE tbl_user.groupshash=\'0\' OR tbl_user.groupshash=\'\')').callback(next);
					return;
				}

				var appskeys = {};
				var notexist = [];

				for (var i = 0; i < item.groups.length; i++) {
					var g = item.groups[i];
					var group = MAIN.groupscache[g];
					if (group == null) {
						notexist.push(g);
					} else {
						for (var j = 0; j < group.apps.length; j++)
							appskeys[group.apps[j]] = 1;
					}
				}

				var db = DBMS();

				if (notexist.length) {
					var tmp = {};
					for (var i = 0; i < notexist.length; i++) {
						var group = notexist[i];
						if (!tmp[group]) {
							tmp[group] = 1;
							db.insert('tbl_group', { id: group, name: group, dtcreated: NOW, note: 'Auto-created from users groups' });
						}
					}
				}

				var apps = Object.keys(appskeys);
				var appsid = [];
				for (var i = 0; i < apps.length; i++)
					appsid.push(PG_ESCAPE(apps[i]));

				db.query('DELETE FROM tbl_user_app WHERE inherited=TRUE AND userid IN (SELECT tbl_user.id FROM tbl_user WHERE tbl_user.groupshash=$1{0})'.format((appsid && appsid.length ? ' AND appid NOT IN ({0})'.format(appsid.join(',')) : '')), [groupshash]);

				for (var i = 0; i < appsid.length; i++) {

					var appid = apps[i];
					var app = MAIN.apps.findItem('id', appid);
					if (app == null) {
						console.log('Error: APP NOT FOUND - ' + appid);
						continue;
					}

					// Reads app roles
					var roles = {};
					for (var j = 0; j < item.groups.length; j++) {
						var group = MAIN.groupscache[item.groups[j]];
						var appsroles = group ? group.appsroles[appid] : null;
						if (appsroles) {
							for (var k = 0; k < appsroles.length; k++) {
								// ROLE MUST EXIST
								if (MAIN.rolescache[appsroles[k]])
									roles[appsroles[k]] = 1;
							}
						}
					}

					roles = Object.keys(roles);
					db.query('UPDATE tbl_user_app SET roles=$1 WHERE appid={0} AND inherited=TRUE AND userid IN (SELECT id FROM tbl_user WHERE tbl_user.groupshash=$2)'.format(appsid[i]), [roles, groupshash]);
					db.query('INSERT INTO tbl_user_app (id, userid, appid, roles, inherited, notifications, countnotifications, countbadges, countopen, dtcreated, position) SELECT id||{0}, id, {0}, $1, TRUE, TRUE, 0, 0, 0, NOW(), {1} FROM tbl_user WHERE tbl_user.groupshash=$2 AND NOT EXISTS(SELECT 1 FROM tbl_user_app WHERE tbl_user_app.id=tbl_user.id||{0})'.format(appsid[i], app.position || 0), [roles, groupshash]);
				}

				db.callback(next);

			}, function() {

				// Repairs bad group hash
				var hashes = Object.keys(groupshashes);

				if (hashes.length) {
					var db = DBMS();
					db.update('tbl_user', { groupshash: '' }).notin('groupshash', hashes);
					db.callback(function() {
						FUNC.repairgroupsroles();
					});
				}

				// Releases all sessions
				if (MAIN.session)
					MAIN.session.sessions = {};

				callback && callback();
			});
		});
	});
};

FUNC.refreshapps = function(callback) {
	DBMS().find('tbl_app').sort('dtcreated', true).callback(function(err, response) {
		for (var i = 0; i < response.length; i++) {
			var item = response[i];

			if (!item.icon)
				item.icon = 'rocket';

			if (item.icon.indexOf('fa-') === -1)
				item.icon = 'fa-' + item.icon + (item.icon.indexOf(' ') === -1 ? ' fa' : '');
		}
		MAIN.apps = response || EMPTYARRAY;
		callback && callback();
	});
};

FUNC.refreshmeta = function(callback, directory) {

	var remove = function(item) {
		return !item.name;
	};

	var prepare = function(arr, isou, gr) {
		// gr means "group or roles"
		for (var i = 0; i < arr.length; i++) {

			if (!arr[i].id)
				arr[i].id = arr[i].name;

			if (isou)
				arr[i].name = arr[i].name.replace(/\//g, ' / ');
			if (gr) {
				delete arr[i].dtcreated;
				delete arr[i].dtupdated;
				delete arr[i].note;
			}
		}
		arr = arr.remove(remove);
		return arr;
	};

	var db = DBMS();
	var arg = directory ? [directory || ''] : undefined;
	var plus = directory ? ' WHERE directory=$1' : '';

	db.query('SELECT locality as name FROM tbl_user' + plus + ' GROUP BY locality ORDER BY 1', arg).set('localities');
	db.query('SELECT position as name FROM tbl_user' + plus + ' GROUP BY position ORDER BY 1', arg).set('positions');
	db.query('SELECT language as name FROM tbl_user' + plus + ' GROUP BY language ORDER BY 1', arg).set('languages');
	db.query('SELECT directory as name FROM tbl_user' + plus + ' GROUP BY directory ORDER BY 1', arg).set('directories');
	db.query('SELECT ou as name FROM tbl_user' + plus + ' GROUP BY ou ORDER BY 1', arg).set('ou');
	db.query('SELECT id, name, note, dtcreated, dtupdated FROM tbl_group ORDER BY 2').set('groups');
	db.query('SELECT id, name FROM cl_role ORDER BY 2').set('roles');

	db.callback(function(err, response) {

		var meta = {};
		meta.localities = prepare(response.localities);
		meta.positions = prepare(response.positions);
		meta.directories = prepare(response.directories);
		meta.groups = prepare(response.groups, 0, 1);
		meta.roles = prepare(response.roles, 0, 1);
		meta.languages = prepare(response.languages);
		meta.ou = [];

		for (var i = 0; i < response.ou.length; i++) {
			var ou = response.ou[i];
			if (ou && ou.name) {
				var name = ou.name.join('/');
				meta.ou.push({ id: name, name: name });
			}
		}

		if (directory) {
			MAIN.metadirectories[directory] = meta;
			callback && callback(null, meta);
		} else {
			MAIN.metadirectories = {};
			MAIN.meta = meta;
			meta.directories.wait(function(item, next) {
				FUNC.refreshmeta(next, item.name);
			}, function() {
				callback && callback(null, meta);
			});
		}

	});
};

FUNC.refreshappsroles = function() {
	setTimeout2('updaterolesdelay', FUNC.updateroles, 100);
};

FUNC.refreshmetadelay = function() {
	setTimeout2('refreshmetadelay', FUNC.refreshmeta, 100);
};

FUNC.init = function(callback) {
	var db = DBMS();
	db.modify('tbl_user', { online: false }).where('online', true);
	FUNC.refreshmeta();
	FUNC.refreshapps();
	callback && callback();
};

function checkuser(next) {
	DBMS().read('tbl_user').fields('id').callback(function(err, response) {
		if (response == null) {
			var model = {};
			model.firstname = 'Total';
			model.lastname = 'Admin';
			model.email = 'info@totaljs.com';
			model.login = 'admin';
			model.password = 'admin';
			model.gender = 'male';
			model.sa = true;
			model.desktop = 1;
			model.notifications = true;
			model.notificationsemail = true;
			model.notificationsphone = true;
			model.dateformat = 'yyyy-MM-dd';
			model.timeformat = 24;
			model.volume = 50;
			model.sounds = true;
			model.colorscheme = '#4285f4';
			model.language = 'en';
			model.dtbeg = NOW;
			$INSERT('Users', model, next);
		} else
			next();
	});
}

// Load
PAUSESERVER('initialization');
ON('ready', function() {
	$WORKFLOW('Settings', 'init', function() {

		// Set all users to offline
		DBMS().query('UPDATE tbl_user SET online=FALSE WHERE online=TRUE');

		FUNC.init(function() {
			FUNC.refreshapps(function() {
				FUNC.refreshgroupsroles(function() {
					checkuser(function() {
						FUNC.loadguest(function() {
							PAUSESERVER('initialization');
							refresh_apps();
							EMIT('loaded');
						});
					});
				});
			});
		});
	});
});

// Reads a user
function readuser(id, callback) {
	var db = DBMS();
	db.read('tbl_user').id(id).query('inactive=FALSE AND blocked=FALSE').fields('id,supervisorid,deputyid,accesstoken,verifytoken,directory,directoryid,statusid,status,photo,name,linker,search,dateformat,timeformat,numberformat,firstname,lastname,gender,email,phone,company,locking,pin,language,reference,locality,position,login,colorscheme,background,repo,roles,groups,blocked,customer,notifications,notificationsemail,notificationsphone,countnotifications,countbadges,volume,sa,darkmode,inactive,sounds,online,dtbirth,dtbeg,dtend,dtupdated,dtmodified,dtcreated,dtlogged,dtnotified,countsessions,otp,middlename,contractid,ou,groupshash,dtpassword,desktop,groupid,checksum,oauth2,dn,stamp');
	db.error('error-users-404');
	db.query('SELECT b.id,a.notifications,a.sounds,a.countnotifications,a.countbadges,a.roles,a.favorite,a.position,a.inherited,a.version FROM tbl_user_app a INNER JOIN tbl_app b ON b.id=a.appid WHERE a.userid=$1', [id]).set('apps');

	if (CONF.allowmembers) {
		db.query('SELECT userid FROM tbl_user_member').where('email', db.get('tbl_user.email')).set('member');
		db.query('SELECT id as userid FROM tbl_user WHERE email IN (SELECT email FROM tbl_user_member WHERE userid=$1)', [id]).set('team');
	}

	db.callback(function(err, response) {

		if (err || !response) {
			callback(err, null);
			return;
		}

		var user = response;

		if (user.member) {
			if (user.member.length) {
				for (var i = 0; i < user.member.length; i++)
					user.member[i] = user.member[i].userid;
			} else
				delete user.member;
		}

		if (user.team) {
			if (user.team.length) {
				for (var i = 0; i < user.team.length; i++)
					user.team[i] = user.team[i].userid;
			} else
				delete user.team;
		}

		if (!user.colorscheme)
			user.colorscheme = CONF.colorscheme || '#4285f4';

		var apps = {};
		for (var i = 0; i < user.apps.length; i++) {
			var app = user.apps[i];
			app.appid = app.id;
			if (!app.roles)
				app.roles = EMPTYARRAY;
			apps[app.id] = app;
		}

		user.welcome = !response.dtlogged;
		user.apps = apps;
		user.ticks = NOW.getTime();
		USERS[id] = user;
		callback(null, user);
	});
}

FUNC.updateroles = function(callback) {
	var db = DBMS();
	db.query('SELECT UNNEST(roles) as name FROM tbl_app GROUP BY UNNEST(roles)').callback(function(err, response) {

		var roles = response;
		var id = [];
		var is = false;

		for (var i = 0; i < roles.length; i++) {
			var item = roles[i];
			item.id = item.name;
			id.push(item.id);
		}

		db.find('cl_role').callback(function(err, response) {

			var diff = DIFFARR('id', response, roles);

			for (var i = 0; i < diff.add.length; i++) {
				db.insert('cl_role', diff.add[i]);
				EMIT('roles.create', diff.add[i]);
			}

			is = diff.add.length > 0 || diff.rem.length > 0;

			for (var i = 0; i < diff.rem.length; i++) {

				var pgid = PG_ESCAPE(diff.rem[i]);

				// removes role
				db.remove('cl_role').query('id=' + pgid);

				// removes role from users
				db.query('UPDATE tbl_user SET roles=array_remove(roles,{0}) WHERE ({0}=ANY(roles))'.format(pgid));
				EMIT('roles.remove', diff.rem[i]);
			}

		});

		db.callback(function() {
			if (is)
				FUNC.refreshgroupsroles(() => FUNC.refreshmeta(callback));
			else if (callback)
				callback();
		});
	});
};

function stringifyprepare(key, value) {
	if (key !== 'password' && value != null)
		return value;
}

FUNC.log = function(type, rowid, message, $) {

	var obj = {};
	obj.type = type;

	if (rowid)
		obj.rowid = rowid.max(50);

	obj.message = (message || '').max(200);
	obj.dtcreated = NOW = new Date();

	if ($) {

		if ($.model && $.model !== EMPTYOBJECT)
			obj.data = JSON.stringify($.model, stringifyprepare);

		obj.ip = $.ip;

		if ($.user) {
			obj.ua = $.user.ua;
			obj.userid = $.user.id;
			obj.username = $.user.name;
		} else if ($.headers)
			obj.ua = $.ua || ($.headers['user-agent'] || '').toString(30);

	}

	DBMS().insert('tbl_log', obj);
};

function refresh_apps() {
	MAIN.apps.wait(function(app, next) {

		if (app.workshopid)
			return next();

		FUNC.refreshapp(app, function(err, item, update) {
			if (update) {
				DBMS().modify('tbl_app', item).id(item.id).callback(function() {
					EMIT('apps.sync', item.id);
					next();
				});
			} else {
				EMIT('apps.sync', item.id);
				next();
			}
		});

	}, FUNC.updateroles);
}

function emailnotifications() {

	// online=FALSE
	DBMS().query('WITH rows AS (UPDATE tbl_user SET dtnotified=NOW() WHERE countnotifications>0 AND dtnotified IS NULL AND notificationsemail=TRUE AND inactive=FALSE AND blocked=FALSE RETURNING id) SELECT b.name,b.email,b.language,b.countnotifications,(SELECT array_agg(x.body ORDER BY x.dtcreated DESC) FROM tbl_user_notification x WHERE x.userid=a.id AND x.unread=TRUE LIMIT 20) as messages FROM rows a INNER JOIN tbl_user b ON a.id=b.id').data(function(items) {

		if (!items.length)
			return;

		var messages = [];
		for (var i = 0; i < items.length; i++) {
			var user = items[i];

			if (user.messages && user.messages.length) {
				for (var j = 0; j < user.messages.length; j++)
					user.messages[j] = user.messages[j].replace(/\n|\t|_{1,}|\*{1,}/g, '');
			}

			var msg = Mail.create(TRANSLATOR(user.language, '@(Unread notifications)'), VIEW('mails/notifications', user, null, null, user.language));
			msg.to(user.email);
			msg.from(CONF.mail_address_from, CONF.name);
			messages.push(msg);
		}

		Mail.send2(messages, ERROR('emailnotifications'));
	});
}

var usage_online_cache = 0;
var usage_online = function(err, response) {
	if (response.used !== usage_online_cache) {
		usage_online_cache = response.used;
		var id = NOW.format('yyyyMMdd');
		DBMS().modify('tbl_usage', { online: usage_online_cache, '>maxonline': usage_online_cache }, true).id(id).insert(usage_logged_insert);
	}
};

ON('service', function(counter) {

	if (counter % 10 === 0) {
		refresh_apps();
		if (!CONF.allow_sessions_unused)
			MAIN.session.releaseunused('1 hour');
		USERS = {}; // clears cache
		DDOS = {};
		ORIGINERRORS = {};
		CONF.allownotifications && emailnotifications();
	}

	if (OTPCOUNT) {
		var keys = Object.keys(OTP);
		for (var i = 0; i < keys.length; i++) {
			var otp = OTP[keys[i]];
			if (otp.date < NOW) {
				delete OTP[keys[i]];
				OTPCOUNT--;
			}
		}
	}

	// Auto-reconfiguration
	if (counter % 60 === 0)
		FUNC.reconfigure();

	DBMS().query('SELECT COUNT(1)::int4 as used FROM tbl_user_session WHERE online=TRUE').first().callback(usage_online);
	SIMPLECACHE = {};
});

var usage_logged_insert = function(doc) {
	doc.id = NOW.format('yyyyMMdd');
	doc.date = NOW;
};

var usage_browser_insert = function(doc, params) {
	doc.id = params.id;
	doc.name = params.name.max(50);
	doc.date = NOW;
	doc.mobile = params.mobile;
};

FUNC.usage_logged = function(user) {

	var model = {};
	var model_browser = {};
	var id = NOW.format('yyyyMMdd');

	switch (user.desktop) {
		case 1:
			model['+windowed'] = model_browser['+windowed'] = 1;
			break;
		case 2:
			model['+tabbed'] = model_browser['+tabbed'] = 1;
			break;
		case 3:
			model['+portal'] = model_browser['+portal'] = 1;
			break;
	}

	model['+logged'] = 1;

	if (user.mobile)
		model['+mobile'] = 1;
	else
		model['+desktop'] = 1;

	if (user.darkmode)
		model['+darkmode'] = model_browser['+darkmode'] = 1;
	else
		model['+lightmode'] = model_browser['+lightmode'] = 1;

	var db = DBMS();
	model.dtupdated = model_browser.dtupdated = NOW;
	db.modify('tbl_usage', model, true).id(id).insert(usage_logged_insert);

	var browserid = id + user.ua.hash(true).toString(16);
	model_browser['+count'] = 1;
	db.modify('tbl_usage_browser', model_browser, true).id(browserid).insert(usage_browser_insert, { name: user.ua, id: browserid, mobile: user.mobile });
};

FUNC.uploadir = function(type) {
	var path = CONF.upload ? Path.join(CONF.upload, type) : PATH.public(type);
	return path;
};

if (global.UPDATE)
	global.UPDATE([4400, 4500, 4600, 4700, 4800, 4900], ERROR('Update'), 'updates');
else
	OBSOLETE('Total.js', 'You need to update Total.js framework for a newest version and restart OpenPlatform');