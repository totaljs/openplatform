const OP = global.OP = {};

OP.version = 3120;

// G.meta;

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
	meta.volume = user.volume;
	meta.darkmode = user.darkmode;
	meta.colorscheme = user.colorscheme || CONF.colorscheme;
	meta.background = user.background || CONF.background;
	meta.test = CONF.test === true;

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
				meta.apps.push({ id: app.id, icon: app.icon, title: app.title, name: app.name, online: app.online, version: app.version, linker: app.linker, notifications: app.allownotifications, responsive: app.responsive, countnotifications: user.apps[app.id].countnotifications, countbadges: user.apps[app.id].countbadges, width: app.width, height: app.height, screenshots: app.screenshots == true, resize: app.resize == true, type: app.type, mobilemenu: app.mobilemenu !== false });
		}

		if (user.sa) {
			meta.apps.push({ id: '_users', icon: 'users', title: 'Users', name: 'Users', online: true, internal: true, linker: '_users', width: 800, height: 650, resize: false, mobilemenu: false });
			meta.apps.push({ id: '_apps', icon: 'rocket', title: 'Apps', name: 'Apps', online: true, internal: true, linker: '_apps', width: 800, height: 650, resize: false, mobilemenu: false });
			meta.apps.push({ id: '_settings', icon: 'cogs', title: 'Settings', name: 'Settings', online: true, internal: true, linker: '_settings', width: 600, height: 670, resize: false, mobilemenu: false });
			meta.apps.push({ id: '_info', icon: 'question-circle', title: 'About', name: 'About', online: true, internal: true, linker: '_info', width: 400, height: 290, resize: false, mobilemenu: false });
		}

		meta.apps.push({ id: '_account', icon: 'user-circle', title: 'Account', name: 'Account', online: true, internal: true, linker: '_account', width: 500, height: 730, resize: false, mobilemenu: false });
		callback(null, meta);
	});
};

// Output see the app only
OP.meta = function(app, user, serverside) {

	if (!user.apps || !user.apps[app.id])
		return null;

	var meta = { datetime: NOW, ip: user.ip, accesstoken: OP.encodeAuthToken(app, user), url: app.frame, settings: app.settings, id: app.id };
	meta.verify = CONF.url + '/api/verify/?accesstoken=' + meta.accesstoken;
	meta.openplatform = CONF.url;
	meta.openplatformid = OP.id;
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

	if (app.allowreadmeta)
		meta.meta = G.meta;

	if (app.allowreadprofile) {

		meta.profile = readuser(user, app.allowreadprofile, app);

		// Specific settings for the current user
		var data = user.apps ? user.apps[app.id] : null;
		if (data)
			meta.profile.settings = data.settings;
	}

	if (app.allowreadapps)
		meta.apps = CONF.url + '/api/apps/?accesstoken=' + meta.accesstoken;

	if (app.allowreadusers)
		meta.users = CONF.url + '/api/users/?accesstoken=' + meta.accesstoken;

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

	if (!sign) {
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
	obj.daterefreshed = app.daterefreshed;
	obj.datecreated = app.datecreated;
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

function readuser(user, type, app) {

	// type 1: basic info
	// type 2: all info
	// type 3: app users - basic info
	// type 4: app users - all info

	if (type > 2 && (!user.apps || !user.apps[app.id]) || user.inactive)
		return;

	var obj = {};
	obj.id = user.id;
	obj.supervisorid = user.supervisorid;
	obj.deputyid = user.deputyid;
	obj.apps = user.apps2;
	obj.blocked = user.blocked;
	obj.company = user.company;
	obj.companylinker = user.companylinker;
	obj.datebirth = user.datebirth;
	obj.datecreated = user.datecreated;
	obj.dateend = user.dateend;
	obj.datebeg = user.datebeg;
	obj.dateupdated = user.dateupdated;
	obj.firstname = user.firstname;
	obj.gender = user.gender;
	obj.language = user.language;
	obj.lastname = user.lastname;
	obj.name = user.name;
	obj.notifications = user.notifications;
	obj.online = user.online;
	obj.photo = CONF.url + '/photos/' + user.photo;
	obj.ou = user.ou;
	obj.ougroups = user.ougroups ? Object.keys(user.ougroups) : EMPTYARRAY;
	obj.locality = user.locality;
	obj.localitylinker = user.localitylinker;
	obj.reference = user.reference;
	obj.countnotifications = user.countnotifications || 0;
	obj.countbadges = user.countbadges || 0;
	obj.countsessions = user.countsessions || 0;
	obj.colorscheme = user.colorscheme || CONF.colorscheme;
	obj.background = user.background || CONF.background;
	obj.darkmode = user.darkmode;

	if (obj.background)
		obj.background = CONF.url + '/backgrounds/' + obj.background;

	var appdata = user.apps[app.id];

	if (user.roles && user.roles.length) {
		obj.roles = appdata ? appdata.roles.slice(0) : EMPTYARRAY;
		for (var i = 0; i < user.roles.length; i++)
			obj.roles.push(user.roles[i]);
	} else
		obj.roles = appdata ? appdata.roles : EMPTYARRAY;

	obj.groups = user.groups;
	obj.sa = user.sa;
	obj.sounds = user.sounds;
	obj.volume = user.volume;
	obj.badge = CONF.url + '/api/badges/?accesstoken=' + OP.encodeToken(app, user);

	if (obj.notifications)
		obj.notify = CONF.url + '/api/notify/?accesstoken=' + OP.encodeToken(app, user);

	switch (type) {
		case 2:
		case 4:
			obj.email = user.email;
			obj.phone = user.phone;
			break;
	}

	return obj;
}

OP.users = function(app, query, callback) {
	if (app.allowreadusers) {
		query.appid = app.id;
		FUNC.users.query(query, function(err, users) {
			for (var i = 0; i < users.items.length; i++)
				users.items[i] = readuser(users.items[i], app.allowreadusers, app);
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

OP.refresh = function(app, callback) {
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

			if (response.origin && response.origin.length) {
				app.origin = {};
				for (var i = 0; i < response.origin.length; i++)
					app.origin[response.origin[i]] = true;
			} else
				app.origin = null;
		}

		app.daterefreshed = NOW;
		callback(err, app);
	});
};

// Load
F.wait('initialization');
ON('ready', function() {
	$WORKFLOW('Settings', 'init', function() {
		FUNC.init(() => F.wait('initialization'));
	});
});