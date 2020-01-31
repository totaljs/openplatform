// DB
require('dbms').init(CONF.database, null, ERROR('DBMS'));

// Constants
const Fs = require('fs');
const DB_ONLINE = { online: true };
const DB_OFFLINE = { online: false };
const DB_LOGGED = { online: true };
const DDOS_MAX_ATTEMPS = 10;

var OTP = {};
var OTPCOUNT = 0;
var SIMPLECACHE = {};
var DDOS = {};

MAIN.id = 0;                   // Current ID of OpenPlatform
MAIN.version = 4500;           // Current version of OpenPlatform
// MAIN.guest                  // Contains a guest user instance
// MAIN.apps                   // List of all apps
// MAIN.roles                  // List of all roles (Array)
// MAIN.rolescache             // List of all roles (Object)
// MAIN.groups                 // List of all groups (Array)
// MAIN.groupscache            // List of all groups (Object)

MAIN.meta = {};
MAIN.metadirectories = {};
MAIN.notifications = {};

// Temporary
var USERS = {};

MAIN.logout = function(controller) {
	controller.redirect('/');
};

// Total.js Session management
MAIN.session = SESSION();

// Loads a specified user session
MAIN.session.ondata = function(meta, next) {
	readuser(meta.id, function(err, user) {

		if (err || !user) {
			next(err, null);
			return;
		}

		user.rev = GUID(5); // revision
		DB_ONLINE.dtlogged = NOW;
		DBMS().modify('tbl_user', DB_ONLINE).where('id', meta.id);
		next(null, user);
	});
};

MAIN.session.onrelease = function(item) {
	MAIN.session.contains2(item.id, function(err, data) {
		if (!data)
			DBMS().modify('tbl_user', DB_OFFLINE).where('id', item.id);
	});
};

FUNC.loginid = function(controller, userid, callback, note) {
	FUNC.cookie(controller.req, userid, callback, note);
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
	DBMS().read('tbl_user').fields('id,password,otp,otpsecret').query('login=$1 OR email=$1', [login]).callback(function(err, response) {
		if (response) {
			if (response.otp) {
				if (!OTP[login])
					OTPCOUNT++;
				OTP[login] = { date: NOW.add('2 minutes'), id: response.id, otpsecret: response.otpsecret };
				callback(null, 'otp');
			} else {

				if (response.password === password.hash(CONF.hashmode || 'sha256', CONF.hashsalt)) {
					callback(null, response.id);
					return;
				}

			}
		}
		callback();
	});
};

FUNC.logout = function(controller) {
	controller.cookie(CONF.cookie, '', '-5 days');
	controller.user.online = false;
	MAIN.session.remove(controller.sessionid);
	DBMS().modify('tbl_user', DB_OFFLINE).where('id', controller.user.id);
	MAIN.logout(controller);
};

FUNC.cookie = function(req, user, sessionid, callback, note) {

	if (typeof(sessionid) === 'function') {
		note = callback;
		callback = sessionid;
		sessionid = null;
	}

	var id;
	var opt = {};

	if (typeof(user) === 'string') {
		id = user;
		user = null;
	} else
		id = user.id;

	opt.name = CONF.cookie;
	opt.key = CONF.cookie_key || 'auth';
	opt.sessionid = sessionid || UID();
	opt.id = id;
	opt.expire = CONF.cookie_expiration || '3 days';
	opt.data = user;
	opt.note = note;

	// Beause of new verification token
	MAIN.session.release2(id);

	MAIN.session.setcookie(req, opt, function() {
		DB_LOGGED.verifytoken = U.GUID(15);
		DBMS().modify('tbl_user', DB_LOGGED).where('id', id);
		callback && callback();
	});
};

// Returns a user profile object
FUNC.profile = function(user, callback) {

	var meta = {};
	meta.openplatformid = MAIN.id;
	meta.version = MAIN.version;
	meta.name = user.name;
	meta.photo = user.photo;
	// meta.locality = user.locality;
	// meta.ou = user.ou;
	// meta.company = user.company;
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

	if (user.guest)
		meta.guest = true;

	meta.team = user.team ? user.team.length : 0;
	meta.member = user.member ? user.member.length : 0;

	var bg = user.background || CONF.background;
	if (bg)
		meta.background = bg;

	if (CONF.test === true)
		meta.test = true;

	meta.status = user.status;

	if (user.directory)
		meta.directory = user.directory;

	meta.directoryid = user.directoryid || 0;

	for (var i = 0; i < MAIN.apps.length; i++) {
		var app = MAIN.apps[i];
		var userapp = user.apps[app.id];
		if (app && !app.blocked && userapp)
			meta.apps.push({ id: app.id, favorite: userapp.favorite, icon: app.icon, title: app.titles ? (app.titles[user.language] || app.title) : app.title, name: app.name, online: app.online, version: app.version, linker: app.linker, notifications: app.allownotifications, mutenotifications: userapp.notifications === false, responsive: app.responsive, countnotifications: userapp.countnotifications, countbadges: userapp.countbadges, width: app.width, height: app.height, screenshots: app.screenshots == true, resize: app.resize == true, type: app.type, mobilemenu: app.mobilemenu !== false, position: userapp.position == null ? app.position : userapp.position, color: app.color, workshopid: app.workshopid });
	}

	if (user.sa)
		meta.apps.push({ id: '_admin', icon: 'cog', title: TRANSLATOR(user.language, '@(Control panel)'), name: 'Admin', online: true, internal: true, linker: '_admin', width: 1280, height: 960, resize: true, mobilemenu: true });

	CONF.welcome && meta.apps.push({ id: '_welcome', icon: 'flag', title: TRANSLATOR(user.language, '@(Welcome)'), name: 'Welcome', online: true, internal: true, linker: CONF.welcome, width: 800, height: 600, resize: false, mobilemenu: false });

	if (!user.guest)
		meta.apps.push({ id: '_account', icon: 'user-circle', title: TRANSLATOR(user.language, '@(Account)'), name: 'Account', online: true, internal: true, linker: '_account', width: 550, height: 800, resize: false, mobilemenu: false });

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

	if (user.locking)
		meta.locking = user.locking;

	if (user.guest)
		meta.guest = true;

	var bg = user.background || CONF.background;
	if (bg)
		meta.background = bg;

	if (CONF.test === true)
		meta.test = true;

	if (user.status)
		meta.status = user.status;

	meta.apps = user.apps;

	if (MAIN.notifications[user.id]) {
		meta.notifications = MAIN.notifications[user.id];
		delete MAIN.notifications[user.id];
	}

	return meta;
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

	meta.colorscheme = CONF.colorscheme;
	meta.background = CONF.background;

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
		AUDIT('tokens', $, 'FUNC.decodetoken:sign==empty', sign);
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

	if (app == null) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		AUDIT('tokens', $, 'FUNC.decodetoken:app==null', sign);
		$.invalid('error-invalid-accesstoken');
		return;
	}

	if (user == null) {
		// reads user from DB
		readuser(arr[1], function(err, user) {
			if (user == null) {
				DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
				$.invalid('error-invalid-accesstoken');
			} else {
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
			}
		});
	} else {
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
	}
};

FUNC.unauthorized = function(obj, $) {
	var app = obj.app;
	var user = obj.user;
	if (app.origin) {
		if (app.origin.indexOf($.ip) == -1 && app.hostname !== $.ip && (!$.user || $.user.id !== user.id)) {
			$.invalid('error-invalid-origin');
			return true;
		}
	} else if (app.hostname !== $.ip && (!$.user || $.user.id !== user.id)) {
		$.invalid('error-invalid-origin');
		return true;
	}

	if (user.blocked || user.inactive) {
		$.invalid('error-accessible');
		return true;
	}
};

FUNC.notadmin = function($) {
	if (!$.user.sa) {
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
		// AUDIT('tokens', $, 'FUNC.decodeauthtoken:sign==empty', sign);
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
		// AUDIT('tokens', $, 'FUNC.decodeauthtoken:sign==null', sign);
		$.invalid('error-invalid-accesstoken');
		return;
	}

	var arr = sign.split('-');
	if (arr.length !== 3)
		return null;

	var app = MAIN.apps.findItem('id', arr[0]);
	var user = USERS[arr[1]];

	if (app == null) {
		DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
		// AUDIT('tokens', $, 'FUNC.decodeauthtoken:app==null', sign);
		$.invalid('error-invalid-accesstoken');
		return;
	}

	if (user == null) {
		// reads user from DB
		readuser(arr[1], function(err, user) {
			if (user == null) {
				DDOS[$.ip] = (DDOS[$.ip] || 0) + 1;
				$.invalid('error-invalid-accesstoken');
			} else {
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
			}
		}, true);
	} else {
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
	obj.services = Object.keys(app.services);

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

	if ((!fields || fields.roles)) {
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
		obj.badge = CONF.url + '/api/badges/?accesstoken=' + token;

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

FUNC.refreshapp = function(app, callback, refreshmeta) {

	var checksum = app.checksum || '';

	RESTBuilder.GET(app.url).exec(function(err, response, output) {

		if (err || !response.url) {

			app.online = false;
			app.checksum = '';

		} else {

			var meta = CONVERT(response, 'name:String(30),description:String(100),color:String(8),icon:String(30),url:String(500),author:String(50),type:String(30),version:String(20),email:String(120),width:Number,height:Number,resize:Boolean,mobilemenu:Boolean,serververify:Boolean,reference:String(40),roles:[String],origin:[String],allowreadapps:Number,allowreadusers:Number,allowreadprofile:Number,allownotifications:Boolean,allowreadmeta:Boolean,responsive:boolean');

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

			if (refreshmeta || app.autorefresh) {
				app.allowreadapps = meta.allowreadapps;
				app.allowreadusers = meta.allowreadusers;
				app.allowreadprofile = meta.allowreadprofile;
				app.allownotifications = meta.allownotifications;
				app.allowreadmeta = meta.allowreadmeta;
			}

			if (meta.origin && meta.origin instanceof Array && meta.origin.length)
				app.origin = meta.origin;
			else
				app.origin = null;

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

				if (groupshash == 0)
					return next();

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
						var appsroles = group.appsroles[appid];
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
				var db = DBMS();
				hashes.length && db.update('tbl_user', { groupshash: '' }).notin('groupshash', hashes);
				db.query('DELETE FROM tbl_user_app WHERE inherited=TRUE AND userid IN (SELECT tbl_user.id FROM tbl_user WHERE tbl_user.groupshash IS NULL OR tbl_user.groupshash=\'\')');

				// Releases all sessions
				MAIN.session.release();
				callback && callback();
			});
		});
	});
};

FUNC.refreshapps = function(callback) {
	DBMS().find('tbl_app').sort('dtcreated', true).callback(function(err, response) {

		var fa = { fa: 1, fas: 1, far: 1, fab: 1, fal: 1 };

		for (var i = 0; i < response.length; i++) {
			var item = response[i];
			item.icon = item.icon.replace('fa-', '');
			if (item.icon.indexOf(' ') !== -1) {
				var tmp = item.icon.split(' ');
				if (fa[tmp[0]])
					item.icon = tmp[1] + ' ' + tmp[0];
			}
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
							recovery(function() {
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
});

// Reads a user
function readuser(id, callback) {
	var db = DBMS();
	db.read('tbl_user').where('id', id).query('inactive=FALSE AND blocked=FALSE');
	db.error('error-users-404');
	db.query('SELECT b.id,a.notifications,a.countnotifications,a.countbadges,a.roles,a.favorite,a.position,a.inherited,a.version FROM tbl_user_app a INNER JOIN tbl_app b ON b.id=a.appid WHERE a.userid=$1', [id]).set('apps');

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

function recovery(next) {
	Fs.readFile(PATH.databases('users.json'), function(err, data) {

		if (err) {
			next();
			return;
		}

		var users = data.toString('utf8').parseJSON(true);

		Fs.readFile(PATH.databases('apps.json'), function(err, data) {

			var apps = data ? data.toString('utf8').parseJSON(true) : [];
			var groups = {};

			for (var i = 0; i < users.length; i++) {
				var user = users[i];
				if (user.groups) {
					for (var j = 0; j < user.groups.length; j++)
						groups[user.groups[j]] = 1;
				}
			}

			var groups = Object.keys(groups);
			groups.wait(function(item, next) {
				$PATCH('Users/Groups', { id: item, name: item, note: 'Re-imported' }, function(err) {
					if (err)
						console.log('Error re-import group:', err, item);
					next();
				});
			}, function() {

				// IMPORT users
				users.wait(function(item, next) {
					item.apps = undefined;
					item.previd = item.id;
					item.roles = undefined;
					$INSERT('Users', item, function(err) {
						if (err)
							console.log('Error re-import user:', err, item.name);
						next();
					});

				}, function() {
					// IMPORT APPS
					apps.wait(function(item, next) {
						item.previd = item.id;
						item.settings = undefined;
						var model = $MAKE('Apps', item);
						model.$async(function(err) {
							if (err)
								console.log('Error re-import app:', err, item.title);
							next();
						}).$workflow('refresh').$insert();
					}, function() {
						Fs.readFile(PATH.databases('settings.json'), function(err, data) {

							if (data) {
								// update settings
								$GET('Settings', '', function(err, model) {
									$SAVE('Settings', U.copy(data.toString('utf8').parseJSON(true), model), function(err) {
										if (err)
											console.log('Error re-import settings:', err);
										next();
									});
								});
							} else
								next();

							Fs.rename(PATH.databases('apps.json'), PATH.databases('apps_bk.json'), NOOP);
							Fs.rename(PATH.databases('users.json'), PATH.databases('users_bk.json'), NOOP);
							Fs.rename(PATH.databases('settings.json'), PATH.databases('settings_bk.json'), NOOP);
						});
					});
				});
			});
		});
	});
}

FUNC.log = function(type, rowid, message, $) {

	var obj = {};
	obj.type = type;
	obj.rowid = rowid;
	obj.message = (message || '').max(200);
	obj.dtcreated = NOW;

	if ($) {
		obj.ip = $.ip;
		if ($.user) {
			obj.ua = $.user.ua;
			obj.userid = $.user.id;
			obj.username = $.user.name;
		}
	}

	LOGGER('audit', JSON.stringify(obj));
	DBMS().insert('tbl_log', obj);
};

function refresh_apps() {
	MAIN.apps.wait(function(app, next) {

		if (app.workshopid)
			return next();

		FUNC.refreshapp(app, function(err, item, update) {
			if (update) {
				DBMS().modify('tbl_app', item).where('id', item.id).callback(function() {
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
	DBMS().query('WITH rows AS (UPDATE tbl_user SET dtnotified=NOW() WHERE countnotifications>0 AND dtnotified IS NULL AND notificationsemail=TRUE AND inactive=FALSE AND blocked=FALSE RETURNING id) SELECT b.name,b.email,b.language,b.countnotifications FROM rows a INNER JOIN tbl_user b ON a.id=b.id').data(function(items) {

		if (!items.length)
			return;

		var messages = [];
		for (var i = 0; i < items.length; i++) {
			var user = items[i];
			var msg = Mail.create(TRANSLATOR(user.language, '@(Unread notifications)'), VIEW('mails/notifications', user, null, null, user.language));
			msg.to(user.email);
			msg.from(CONF.mail_address_from, CONF.name);
			messages.push(msg);
		}

		Mail.send2(messages, ERROR('emailnotifications'));
	});
}

ON('service', function(counter) {

	if (counter % 10 === 0) {
		refresh_apps();
		if (!CONF.allow_sessions_unused)
			MAIN.session.releaseunused('1 hour');
		USERS = {}; // clears cache
		DDOS = {};
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

	SIMPLECACHE = {};
});

if (global.UPDATE) {
	global.UPDATE([4400], ERROR('Update'), 'updates');
} else
	OBSOLETE('Total.js', 'You need to update Total.js framework for a newest version and restart OpenPlatform');