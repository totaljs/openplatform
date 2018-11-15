const Fs = require('fs');

FUNC.apps = {};
FUNC.users = {};
FUNC.sessions = {};
FUNC.common = {};
FUNC.settings = {};
FUNC.notifications = {};
FUNC.badges = {};

// ====================================
// Users
// ====================================

FUNC.users.set = function(user, fields, callback) {

	// @user {Object/Object Array}
	// @fields {String Array} Optional, changed fields
	// @callback {Function} Optional

	if (user instanceof Array) {
		// nothing
	} else if (user.id) {
		var item = G.users.findItem('id', user.id);
		if (item) {
			U.extend(user, item);
		}
	} else {
		user.id = UID();
		G.users.push(user);
	}

	save(2);
	callback && callback(null, user.id);
};

FUNC.users.get = function(id, callback) {
	// Finds a user by ID
	callback(null, G.users.findItem('id', id));
};

FUNC.users.query = function(filter, callback) {

	// filter.take
	// filter.skip
	// filter.appid

	var arr = [];

	if (filter.appid) {
		for (var i = 0; i < G.users.length; i++) {
			var user = G.users[i];
			if (user.apps && user.apps[filter.appid])
				arr.push(user);
		}
	}

	var data = {};
	data.items = arr;
	data.limit = data.count = data.items.length;
	data.page = 1;
	data.pages = 1;
	callback(null, data);
};

FUNC.users.rem = function(id, callback) {
	var item = G.users.findItem('id', id);
	if (item) {

		G.users = G.users.remove('id', id);

		// Supervisor
		for (var i = 0, length = G.users.length; i < length; i++) {
			var tmp = G.users[i];
			if (tmp.supervisorid === id)
				tmp.supervisorid = '';
		}

		Fs.unlink(F.path.databases('notifications_' + user.id + '.json'), NOOP);
		save(2);
	}

	callback(null, item);
};

FUNC.users.login = function(login, password, callback) {

	var user = G.users.findItem('login', login);
	if (user == null || password.sha256() !== user.password)
		callback();
	else
		callback(null, user);
};

FUNC.users.logout = function(user, controller) {
	controller.redirect('/');
};

FUNC.users.password = function(login, callback) {
	var user = G.users.findItem('login', login);
	callback(null, user);
};

FUNC.users.stream = function(limit, fn, callback) {

	// Streams all users
	// fn(users, next);
	// done: callback()

	fn(G.users, function() {
		callback && callback();
	});
};

FUNC.users.online = function(user, is, callback) {
	user.online = is;
	callback && callback(null);
};

// Codelist
FUNC.users.meta = function(callback) {

	var ou = {};
	var localities = {};
	var companies = {};
	var customers = {};
	var groups = {};
	var roles = {};

	var toArray = function(obj, preparator) {
		var arr = Object.keys(obj);
		var output = [];
		for (var i = 0, length = arr.length; i < length; i++)
			output.push(preparator ? preparator(obj[arr[i]]) : obj[arr[i]]);
		output.quicksort('name');
		return output;
	};

	for (var i = 0, length = G.users.length; i < length; i++) {

		var item = G.users[i];

		var ougroups = item.ougroups ? Object.keys(item.ougroups) : EMPTYARRAY;

		for (var j = 0; j < ougroups.length; j++) {
			var oukey = ougroups[j];
			if (ou[oukey])
				ou[oukey].count++;
			else
				ou[oukey] = { count: 1, name: oukey };
		}

		if (item.groups) {
			for (var j = 0; j < item.groups.length; j++) {
				var g = item.groups[j];
				if (groups[g])
					groups[g].count++;
				else
					groups[g] = { count: 1, id: g, name: g };
			}
		}

		if (item.roles) {
			for (var j = 0; j < item.roles.length; j++) {
				var r = item.roles[j];
				if (roles[r])
					roles[r].count++;
				else
					roles[r] = { count: 1, id: r, name: r };
			}
		}

		if (item.locality) {
			if (localities[item.locality])
				localities[item.locality].count++;
			else
				localities[item.locality] = { count: 1, id: item.locality.slug(), name: item.locality };
		}

		if (item.company) {
			if (item.customer) {
				if (customers[item.company])
					customers[item.company].count++;
				else
					customers[item.company] = { count: 1, id: item.company.slug(), name: item.company };
			}
			if (companies[item.company])
				companies[item.company].count++;
			else
				companies[item.company] = { count: 1, id: item.company.slug(), name: item.company };
		}
	}

	// G.meta === important
	var meta = G.meta = {};
	meta.companies = toArray(companies);
	meta.customers = toArray(customers);
	meta.localities = toArray(localities);
	meta.groups = toArray(groups);
	meta.roles = toArray(roles);
	meta.languages = F.config.languages;

	meta.ou = toArray(ou, function(item) {
		item.id = item.name = item.name.replace(/\//g, ' / ');
		return item;
	});

	callback && callback(null, meta);
};

// ====================================
// Apps
// ====================================

FUNC.apps.get = function(id, callback) {
	// Finds a user by ID
	callback(null, G.apps.findItem('id', id));
};

FUNC.apps.set = function(app, fields, callback) {

	if (app.id) {
		var item = G.apps.findItem('id', app.id);
		if (item) {
			U.extend(item, app);
		}
	} else {
		app.id = UID();
		F.global.apps.push(app);
	}

	save(1);
	G.apps.quicksort('title');
	callback && callback(null, app.id);
};

FUNC.apps.rem = function(id, callback) {
	var item = G.apps.findItem('id', id);
	if (item) {

		G.apps = G.apps.remove('id', id);

		// Remove apps from the all users
		F.global.users.forEach(function(item) {
			delete item.apps[id];
		});

		save(1);
	}

	callback(null, item);
};

FUNC.apps.stream = function(limit, fn, callback) {
	// Streams all apps
	// fn(users, next);
	// done: callback()
	fn(G.apps, function() {
		callback && callback();
	});
};

FUNC.apps.query = function(filter, callback) {
	// filter.take
	// filter.skip
	// filter.id {String Array}
	var obj = {};
	obj.count = obj.limit = G.apps.length;
	obj.items = G.apps;
	obj.page = 1;
	obj.pages = 1;
	callback(null, obj);
};

// ====================================
// Sessions
// ====================================

FUNC.sessions.lock = function(key, expire, callback) {

	if (F.cache.get2(key))
		return;

	F.cache.set(key, 1, expire);

	// This method locks some operation according to the key
	// For example: sending notifications
	callback();
};

FUNC.sessions.unlock = function(key, callback) {
	F.cache.remove(key);
	// This method unlocks some operation according to the key
	callback && callback();
};

FUNC.sessions.set = function(key, value, expire, callback) {

	if (typeof(expire) === 'function') {
		callback = expire;
		expire = null;
	}

	F.cache.set(key, value, expire);
	callback && callback(null);
};

FUNC.sessions.get = function(key, callback) {
	callback(null, F.cache.get2(key));
};

FUNC.sessions.rem = function(key, callback) {
	F.cache.remove(key);
	callback(null);
};

// ====================================
// Settings
// ====================================

FUNC.settings.get = function(callback) {
	Fs.readFile(F.path.databases('settings.json'), function(err, response) {
		callback(null, response ? response.toString('utf8').parseJSON(true) : {});
	});
};

FUNC.settings.set = function(data, callback) {
	Fs.writeFile(F.path.databases('settings.json'), JSON.stringify(data), NOOP);
	callback && callback(null);
};

// ====================================
// Notifications
// ====================================

FUNC.notifications.add = function(data, callback) {
	// data.userid
	// data.appid
	// data.type
	// data.body
	// data.data
	// data.title
	// data.ip
	// data.datecreated

	var filename = F.path.databases('notifications_' + data.userid + '.json');
	Fs.appendFile(filename, JSON.stringify(data) + ',', NOOP);
	callback && callback();
};

FUNC.notifications.rem = function(userid, callback) {
	var filename = F.path.databases('notifications_' + userid + '.json');
	Fs.unlink(filename, NOOP);

	var user = G.users.findItem('id', userid);
	if (user) {
		user.countnotifications = 0;
		var keys = Object.keys(user.apps);
		for (var i = 0; i < keys.length; i++)
			user.apps[keys[i]].countnotifications = 0;
		save(2);
	}

	callback && callback();
};

FUNC.notifications.get = function(userid, callback) {

	// Reads notifications + remove it

	var filename = F.path.databases('notifications_' + userid + '.json');
	Fs.readFile(filename, function(err, data) {

		if (err) {
			callback(err);
			return;
		}

		var body = data.toString('utf8');
		callback(null, '[' + body.substring(0, body.length - 1) + ']');
	});
};

// ====================================
// Common
// ====================================

FUNC.init = function(callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, response) {
		G.users = response ? response.toString('utf8').parseJSON(true) : [];

		for (var i = 0, length = G.users.length; i < length; i++) {
			var u = G.users[i];
			u.online = false;
			u.countsessions = 0;
		}

		FUNC.users.meta();

		Fs.readFile(F.path.databases('apps.json'), function(err, response) {
			G.apps = response ? response.toString('utf8').parseJSON(true) : [];

			for (var i = 0, length = G.apps.length; i < length; i++)
				G.apps[i].online = false;

			G.apps.quicksort('title');
			G.apps.length && $WORKFLOW('App', 'state');

			callback && callback();
		});
	});
};

FUNC.emit = function(type, a, b, c, d, e) {
	F.isCluster && F.cluster.emit(type, a, b, c, d, e);
	EMIT(type, a, b, c, d, e);
};

FUNC.on = function(type, callback) {
	ON(type, callback);
};

FUNC.error = function(place, err) {
	F.error(err, null, place);
};

FUNC.logger = LOGGER;

// FileStorage
function save(type) {
	setTimeout2('OP.saveState.' + (type || 0), function() {

		if (!type || type === 2) {
			EMIT('users.backup', G.users);
			Fs.writeFile(F.path.databases('users.json'), JSON.stringify(G.users), F.error());
		}

		if (!type || type === 1) {
			EMIT('apps.backup', G.apps);
			Fs.writeFile(F.path.databases('apps.json'), JSON.stringify(G.apps), F.error());
		}

	}, 1000, 10);
}
