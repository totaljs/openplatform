const Fs = require('fs');
const OP = global.OP = {};

// F.global.users = [];
// F.global.apps = [];
// F.global.meta = { groups: [], places: [], positions: [], companies: [], departments: [] };

// Saves stats into the file
OP.save = function(callback) {
	F.global.users.quicksort('name');
	F.global.apps.quicksort('name');
	Fs.writeFile(F.path.databases('users.json'), JSON.stringify(F.global.users), NOOP);
	Fs.writeFile(F.path.databases('apps.json'), JSON.stringify(F.global.apps), NOOP);
	callback && callback();
};

OP.saveState = function(type) {
	setTimeout2('OP.saveState.' + (type || 0), function() {

		if (!type || type === 2)
			Fs.writeFile(F.path.databases('users.json'), JSON.stringify(F.global.users), NOOP);

		if (!type || type === 1)
			Fs.writeFile(F.path.databases('apps.json'), JSON.stringify(F.global.apps), NOOP);

	}, 1000, 10);
};

OP.load = function(callback) {
	$WORKFLOW('Settings', 'init', function() {

		Fs.readFile(F.path.databases('users.json'), function(err, response) {
			F.global.users = response ? response.toString('utf8').parseJSON(true) : [];
			Fs.readFile(F.path.databases('apps.json'), function(err, response) {
				F.global.apps = response ? response.toString('utf8').parseJSON(true) : [];
				F.global.apps.length && $WORKFLOW('App', 'state');
				callback && callback();
			});

			// Refreshes meta info
			$WORKFLOW('User', 'refresh');
		});
	});
};

// Return user profile object
OP.profile = function(user) {

	var meta = {};
	meta.name = user.name;
	meta.photo = user.photo;
	meta.position = user.position;
	meta.group = user.group;
	meta.department = user.department;
	meta.place = user.place;
	meta.company = user.company;
	meta.sa = user.sa;
	meta.apps = [];
	meta.countnotifications = user.countnotifications;
	meta.sounds = user.sounds;

	for (var i = 0, length = F.global.apps.length; i < length; i++) {
		var app = F.global.apps[i];
		!app.blocked && user.apps[app.id] && meta.apps.push({ id: app.id, icon: app.icon, title: app.title, name: app.name, online: app.online, version: app.version, linker: app.linker, notifications: app.allownotifications, responsive: app.responsive, countnotifications: user.apps[app.id].countnotifications });
	}

	return meta;
};

// Output see the app only
OP.meta = function(app, user, serverside) {

	if (!user.apps || !user.apps[app.id])
		return null;

	var meta = { datetime: F.datetime, ip: user.ip, accesstoken: app.accesstoken + '-' + app.id + '-' + user.accesstoken + '-' + user.id + '-' + user.verifytoken, url: app.frame, settings: app.settings, id: app.id };

	meta.verify = F.config.url + '/api/verify/?accesstoken=' + meta.accesstoken;
	meta.openplatform = F.config.url;

	if (app.serververify && !serverside) {
		meta.serverside = true;
		return meta;
	} else
		meta.serverside = serverside === true;

	if (app.allowreadmeta)
		meta.meta = F.global.meta;

	if (app.allowreadprofile) {

		meta.profile = readuser(user, app.allowreadprofile, app);

		// Specific settings for the current user
		var data = user.apps ? user.apps[app.id] : null;
		if (data) {
			meta.profile.settings = data.settings;
			meta.profile.roles = data.roles || EMPTYARRAY;
		}
	}

	if (app.allowreadapps) {
		meta.apps = [];
		for (var i = 0, length = F.global.apps.length; i < length; i++) {
			var item = readapp(F.global.apps[i], app.allowreadapps);
			item && meta.apps.push(item);
		}
	}

	if (app.allowreadusers) {
		meta.users = [];
		for (var i = 0, length = F.global.users.length; i < length; i++) {
			var item = readuser(F.global.users[i], app.allowreadusers, app);
			item && meta.users.push(item);
		}
	}

	return meta;
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
	obj.idsupervisor = user.idsupervisor;
	obj.apps = user.apps2;
	obj.blocked = user.blocked;
	obj.company = user.company;
	obj.companylinker = user.companylinker;
	obj.datebirth = user.datebirth;
	obj.datecreated = user.datecreated;
	obj.dateend = user.dateend;
	obj.datestart = user.datestart;
	obj.dateupdated = user.dateupdated;
	obj.department = user.department;
	obj.departmentlinker = user.departmentlinker;
	obj.firstname = user.firstname;
	obj.gender = user.gender;
	obj.globalroles = user.roles;
	obj.globalgroups = user.groups;
	obj.group = user.group;
	obj.grouplinker = user.grouplinker;
	obj.language = user.language;
	obj.lastname = user.lastname;
	obj.name = user.name;
	obj.notifications = user.notifications;
	obj.online = user.online;
	obj.photo = F.config.url + '/photos/' + user.photo;
	obj.place = user.place;
	obj.placelinker = user.placelinker;
	obj.position = user.position;
	obj.positionlinker = user.positionlinker;
	obj.reference = user.reference;
	obj.roles = user.apps[app.id];
	obj.sa = user.sa;
	obj.sounds = user.sounds;

	if (obj.notifications)
		obj.notify = F.config.url + '/api/notify/?accesstoken=' + app.accesstoken + '-' + app.id + '-' + user.accesstoken + '-' + user.id;

	switch (type) {
		case 2:
		case 4:
			obj.email = user.email;
			obj.phone = user.phone;
			break;
	}

	return obj;
}

F.helpers.profile = function() {
	return JSON.stringify(readuser(this.user, 1));
};

// Load
OP.load();
