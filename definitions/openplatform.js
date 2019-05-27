const Fs = require('fs');
const OP = global.OP = {};

OP.version = 4200;
G.meta = {};
G.metadirectories = {};

// Total.js session management
OP.session = SESSION();

OP.session.ondata = function(meta, next) {
	FUNC.users.get(meta.id, function(err, user) {
		if (user && !user.inactive && !user.blocked) {

			user.dtlogged = NOW;
			user.online = true;

			// Write info
			FUNC.users.set(user, ['dtlogged', 'online']);

			OP.session.count(user.id, function(err, stats) {
				user.countsessions = stats.count;
			});

			// Write session
			next(null, user);
		} else
			next();
	});
};

OP.session.onrelease = function(item) {
	if (item.data)
		item.data.online = false;
};

OP.logout = function(controller) {
	controller.cookie(CONF.cookie, '', '-5 days');
	controller.user.online = false;
	OP.session.remove(controller.sessionid);
	FUNC.users.set(controller.user, ['online']);
	FUNC.users.logout(controller.user, controller);
};

ON('service', function(counter) {
	if (counter % 10 === 0)
		OP.session.releaseunused('1 hour');
});

OP.cookie = function(req, user, sessionid, callback, note) {

	if (typeof(sessionid) === 'function') {
		note = callback;
		callback = sessionid;
		sessionid = null;
	}

	var opt = {};
	opt.name = CONF.cookie;
	opt.key = CONF.cookie_key || 'auth';
	opt.sessionid = sessionid || UID();
	opt.id = user.id;
	opt.expire = CONF.cookie_expiration || '1 month';
	opt.data = user;
	opt.note = note;

	OP.session.setcookie(req, opt, function() {
		user.verifytoken = U.GUID(15);
		user.online = true;
		user.dtlogged = NOW;
		FUNC.users.set(user, ['verifytoken', 'dtlogged', 'online']);
		callback && callback();
	});
};

// Return user profile object
OP.profile = function(user, callback) {

	var meta = {};
	meta.openplatformid = OP.id;
	meta.version = OP.version;
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
	meta.repo = user.repo;

	if (user.guest)
		meta.guest = true;

	var bg = user.background || CONF.background;
	if (bg)
		meta.background = bg;

	if (CONF.test === true)
		meta.test = true;

	meta.status = user.status;

	if (user.directory)
		meta.directory = user.directory;

	meta.directoryid = user.directoryid || 0;

	var id = Object.keys(user.apps);

	FUNC.apps.query(id.length ? { id: id } : EMPTYOBJECT, function(err, apps) {

		if (err) {
			FUNC.error('OP.profile', err);
			callback(err, meta);
			return;
		}

		for (var i = 0, length = apps.items.length; i < length; i++) {
			var app = apps.items[i];
			if (!app.blocked && user.apps && user.apps[app.id])
				meta.apps.push({ id: app.id, favorite: user.apps[app.id].favorite, icon: app.icon, title: app.title, name: app.name, online: app.online, version: app.version, linker: app.linker, notifications: app.allownotifications, mutenotifications: user.apps[app.id].notifications === false, responsive: app.responsive, countnotifications: user.apps[app.id].countnotifications, countbadges: user.apps[app.id].countbadges, width: app.width, height: app.height, screenshots: app.screenshots == true, resize: app.resize == true, type: app.type, mobilemenu: app.mobilemenu !== false });
		}

		if (user.sa) {
			meta.apps.push({ id: '_users', icon: 'users', title: 'Users', name: 'Users', online: true, internal: true, linker: '_users', width: 800, height: 650, resize: false, mobilemenu: false });
			if (!user.directory) {
				meta.apps.push({ id: '_apps', icon: 'rocket', title: 'Apps', name: 'Apps', online: true, internal: true, linker: '_apps', width: 900, height: 800, resize: false, mobilemenu: false });
				meta.apps.push({ id: '_settings', icon: 'cogs', title: 'Settings', name: 'Settings', online: true, internal: true, linker: '_settings', width: 600, height: 800, resize: false, mobilemenu: false });
				meta.apps.push({ id: '_info', icon: 'question-circle', title: 'About', name: 'About', online: true, internal: true, linker: '_info', width: 400, height: 335, resize: false, mobilemenu: false });
			}
		}

		CONF.welcome && meta.apps.push({ id: '_welcome', icon: 'flag', title: 'Welcome', name: 'Welcome', online: true, internal: true, linker: CONF.welcome, width: 800, height: 600, resize: false, mobilemenu: false });
		meta.apps.push({ id: '_account', icon: 'user-circle', title: 'Account', name: 'Account', online: true, internal: true, linker: '_account', width: 480, height: 800, resize: false, mobilemenu: false });

		callback(null, meta);
	});
};

// Return user profile object
OP.profilelive = function(user) {

	var meta = {};
	// meta.openplatformid = OP.id;
	// meta.version = OP.version;

	meta.name = user.name;

	if (user.photo)
		meta.photo = user.photo;

	// if (user.locality)
	// 	meta.locality = user.locality;

	// if (user.ou)
	// 	meta.ou = user.ou;

	// if (user.company)
	// 	meta.company = user.company;

	meta.sa = user.sa;
	meta.apps = [];
	meta.countnotifications = user.countnotifications;
	meta.sounds = user.sounds;
	meta.statusid = user.statusid;
	meta.volume = user.volume;
	meta.darkmode = user.darkmode;
	meta.colorscheme = user.colorscheme || CONF.colorscheme;

	if (user.guest)
		meta.guest = true;

	// meta.timeformat = user.timeformat;
	// meta.dateformat = user.dateformat;
	// meta.numberformat = user.numberformat;

	var bg = user.background || CONF.background;
	if (bg)
		meta.background = bg;

	if (CONF.test === true)
		meta.test = true;

	if (user.status)
		meta.status = user.status;

	// if (user.directory)
	// 	meta.directory = user.directory;

	// meta.directoryid = user.directoryid || 0;
	meta.apps = user.apps;

	return meta;
};

// Output see the app only
OP.meta = function(app, user, serverside) {

	if (!user.apps || !user.apps[app.id])
		return null;

	var meta = { date: NOW, ip: user.ip, url: app.frame, id: app.id };
	var token = OP.encodeAuthToken(app, user);

	if (app.settings)
		meta.settings = app.settings;

	if (!serverside) {
		meta.accesstoken = token;
		meta.verify = CONF.url + '/api/verify/?accesstoken=' + token;
	}

	meta.openplatform = CONF.url;
	meta.openplatformid = OP.id;
	meta.name = CONF.name;

	if (CONF.email)
		meta.email = CONF.email;

	if (CONF.verifytoken)
		meta.verifytoken = CONF.verifytoken;

	meta.colorscheme = CONF.colorscheme;
	meta.background = CONF.background;

	if (app.serververify && !serverside) {
		var tmp = readuser(user, app.allowreadprofile, app);
		meta.serverside = true;
		meta.profile = {};
		meta.profile.badge = tmp.badge;
		meta.profile.notify = tmp.notify;
		return meta;
	} else
		meta.serverside = serverside === true;

	if (app.serialnumber)
		meta.serialnumber = app.serialnumber;

	if (app.allowreadmeta)
		meta.meta = CONF.url + '/api/meta/?accesstoken=' + token;

	var data;

	if (app.allowreadprofile) {

		meta.profile = readuser(user, app.allowreadprofile, app);

		// Specific settings for the current user
		data = user.apps ? user.apps[app.id] : null;
		if (data)
			meta.profile.settings = data.settings;

	} else {
		meta.profile = {};
		meta.profile.id = user.id;
		meta.profile.name = user.name;
		meta.profile.dateformat = user.dateformat;
		meta.profile.timeformat = user.timeformat;
		meta.profile.numberformat = user.numberformat;
		meta.profile.language = user.language;
		data = user.apps ? user.apps[app.id] : null;
		if (data)
			meta.profile.settings = data.settings;
	}

	if (app.allowreadapps)
		meta.apps = CONF.url + '/api/apps/?accesstoken=' + token;

	if (app.allowreadusers)
		meta.users = CONF.url + '/api/users/?accesstoken=' + token;

	return meta;
};

OP.metaguest = function() {
	var meta = { date: NOW };
	meta.openplatform = CONF.url;
	meta.openplatformid = OP.id;
	meta.name = CONF.name;
	meta.guest = true;
	meta.id = '0';

	if (CONF.email)
		meta.email = CONF.email;

	if (CONF.verifytoken)
		meta.verifytoken = CONF.verifytoken;

	meta.colorscheme = CONF.colorscheme;
	meta.background = CONF.background;
	meta.profile = CLONE(OP.guest);
	meta.profile.apps = meta.profile.accesstoken = meta.profile.verifytoken = undefined;
	return meta;
};

// Notifications + badges
OP.encodeToken = function(app, user) {
	var sign = app.id + '-' + user.id + '-' + (user.accesstoken + app.accesstoken).crc32(true);
	return sign + '-' + (sign + CONF.accesstoken).crc32(true);
};

OP.decodeToken = function(sign, callback) {

	var arr = sign.split('-');
	if (arr.length !== 4) {
		callback();
		return;
	}

	var tmp = (arr[0] + '-' + arr[1] + '-' + arr[2] + CONF.accesstoken).crc32(true) + '';
	if (tmp !== arr[3]) {
		callback();
		return;
	}

	OP.appuser(arr[0], arr[1], function(app, user) {
		if (!user || !app) {
			callback();
		} else {
			var tmp = (user.accesstoken + app.accesstoken).crc32(true) + '';
			if (tmp === arr[2])
				callback(null, { app: app, user: user });
			else
				callback();
		}
	});
};

// Auth token
OP.encodeAuthToken = function(app, user) {
	var sign = app.id + '-' + user.id;
	sign += '-' + ((user.accesstoken + app.accesstoken).crc32(true) + '' + (app.id + user.id + user.verifytoken + CONF.accesstoken).crc32(true));
	return sign.encrypt(CONF.accesstoken.substring(0, 20));
};

OP.decodeAuthToken = function(sign, callback) {

	if (!sign || sign.length < 30) {
		callback();
		return;
	}

	sign = sign.decrypt(CONF.accesstoken.substring(0, 20));

	if (!sign) {
		callback();
		return;
	}

	var arr = sign.split('-');
	if (arr.length !== 3)
		return null;

	OP.appuser(arr[0], arr[1], function(app, user) {

		if (!app || !user) {
			callback();
			return;
		}

		var tmp = (user.accesstoken + app.accesstoken).crc32(true) + '' + (app.id + user.id + user.verifytoken + CONF.accesstoken).crc32(true);
		if (tmp !== arr[2])
			callback();
		else
			callback(null, { user: user, app: app });
	});
};

function readapp(app, type) {

	// type 1: basic info
	// type 2: all info

	var obj = {};
	obj.id = app.id;
	obj.title = app.title;
	obj.allowreadapps = app.allowreadapps;
	obj.allowreadusers = app.allowreadusers;
	obj.allownotifications = app.allownotifications;
	obj.responsive = app.responsive;
	obj.icon = app.icon;
	obj.description = app.description;
	obj.name = app.name;
	obj.version = app.version;
	obj.online = app.online;
	obj.dtsync = app.dtsync;
	obj.dtcreated = app.dtcreated;
	obj.author = app.author;
	obj.type = app.type;
	obj.mobilemenu = app.mobilemenu;

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
}

function readuser(user, type, app, fields) {

	// type 1: basic info
	// type 2: all info
	// type 3: app users - basic info
	// type 4: app users - all info

	if (type > 2 && (!user.apps || !user.apps[app.id]) || user.inactive)
		return;

	var obj = {};

	if (!fields || fields.id)
		obj.id = user.id;

	if (user.supervisorid || (!fields || fields.supervisorid))
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

	if (!fields || fields.notifications)
		obj.notifications = user.notifications;

	if (!fields || fields.online)
		obj.online = user.online;

	if (user.photo && (!fields || fields.photo))
		obj.photo = CONF.url + '/photos/' + user.photo;

	if (user.ou && (!fields || fields.ou))
		obj.ou = user.ou;

	if (!fields || fields.ougroups)
		obj.ougroups = user.ougroups ? Object.keys(user.ougroups) : EMPTYARRAY;

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

	if (!fields || fields.roles) {
		var appdata = user.apps[app.id];
		if (user.roles && user.roles.length) {
			obj.roles = appdata ? appdata.roles.slice(0) : EMPTYARRAY;
			for (var i = 0; i < user.roles.length; i++) {
				if (obj.roles.indexOf(user.roles[i]) === -1)
					obj.roles.push(user.roles[i]);
			}
		} else
			obj.roles = appdata ? appdata.roles : EMPTYARRAY;
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
		token = OP.encodeToken(app, user);

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
}

OP.users = function(app, query, callback) {
	if (app.allowreadusers) {

		var fields = query.fields ? query.fields instanceof Array ? query.fields : query.fields.split(',') : null;
		var f;

		if (fields) {
			f = {};
			for (var i = 0; i < fields.length; i++)
				f[fields[i]] = 1;
		}

		if (app.allowreadusers !== 1 && app.allowreadusers !== 2)
			query.appid = app.id;

		query.active = true;

		FUNC.users.query(query, function(err, users) {
			for (var i = 0; i < users.items.length; i++) {
				var user = readuser(users.items[i], app.allowreadusers, app, f);
				users.items[i] = user;
			}
			callback(null, users);
		});
	} else
		callback();
};

OP.apps = function(app, query, callback) {
	if (app.allowreadapps) {
		query.appid = app.id;
		FUNC.apps.query(query, function(err, apps) {
			for (var i = 0; i < apps.items.length; i++)
				apps.items[i] = readapp(apps.items[i], app.allowreadapps, app);
			callback(null, apps);
		});
	} else
		callback();
};

OP.ou = function(val) {
	var ou = val.split('/').trim();
	return ou.join(' / ');
};

F.helpers.profile = function() {
	return JSON.stringify(readuser(this.user, 1));
};

OP.appuser = function(appid, userid, callback) {
	FUNC.apps.get(appid, function(err, app) {
		if (app)
			FUNC.users.get(userid, (err, user) => callback(app, user));
		else
			callback();
	});
};

OP.refresh = function(app, callback, meta) {
	var builder = new RESTBuilder(app.url);
	builder.exec(function(err, response, output) {

		if (err || !response.url) {
			app.online = false;
		} else {

			app.hostname = output.hostname.replace(/:\d+/, '');
			app.online = true;
			app.version = response.version;
			app.name = response.name;
			app.description = response.description;
			app.author = response.author;
			app.icon = response.icon;
			app.frame = response.url;
			app.email = response.email;
			app.roles = response.roles;
			app.groups = response.groups;
			app.width = response.width;
			app.height = response.height;
			app.resize = response.resize;
			app.type = response.type;
			app.screenshots = response.allowscreenshots === true;
			app.responsive = response.responsive;
			app.mobilemenu = response.mobilemenu;
			app.serververify = response.serververify;

			if (meta || app.autorefresh) {
				app.allowreadapps = response.allowreadapps;
				app.allowreadusers = response.allowreadusers;
				app.allowreadprofile = response.allowreadprofile;
				app.allownotifications = response.allownotifications;
				app.allowreadmeta = response.allowreadmeta;
			}

			if (response.origin && response.origin instanceof Array && response.origin.length)
				app.origin = response.origin;
			else
				app.origin = null;
		}

		app.dtsync = NOW;
		callback(err, app);
	});
};

OP.guestrefresh = function() {
	FUNC.apps.query({ guest: true }, function(err, apps) {
		OP.guest.apps = {};
		for (var i = 0; i < apps.items.length; i++) {
			var app = apps.items[i];
			OP.guest.apps[app.id] = { roles: [], countnotifications: 0, countbadges: 0 };
		}
	});
};

OP.guestload = function() {

	Fs.readFile(PATH.root('guest.json'), function(err, data) {

		if (err)
			return;

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

			OP.guest = user;
			OP.guestrefresh();
		}
	});
};

// Load
F.wait('initialization');
ON('ready', function() {
	$WORKFLOW('Settings', 'init', function() {
		FUNC.init(function() {
			F.wait('initialization');
			EMIT('loaded');
			OP.guestload();
		});
	});
});
