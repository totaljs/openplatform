const Fs = require('fs');

FUNC.apps = {};
FUNC.users = {};
FUNC.sessions = {};
FUNC.common = {};
FUNC.settings = {};
FUNC.notifications = {};
FUNC.files = {};

// ====================================
// Users
// ====================================

FUNC.users.set = function(user, fields, callback, app) {

	// @user {Object}
	// @fields {String Array} Optional, changed fields
	// @callback {Function} Optional
	// @app {Object} Optional, app instance (can contain an app when the count of notifications/badges is updated)

	if (user.id) {
		var item = G.users.findItem('id', user.id);
		item && U.extend(user, item);
	} else {
		user.id = UID();
		G.users.push(user);
	}

	save(2);
	callback && callback(null, user.id);
};

FUNC.users.get = function(id, callback) {
	if (id[0] === '@') // Find by reference
		callback(null, G.users.findItem('reference', id.substring(1)));
	else // Finds a user by ID
		callback(null, G.users.findItem('id', id));
};

FUNC.users.query = function(filter, callback) {

	// filter.page
	// filter.limit
	// filter.appid

	if (filter.q)
		filter.q = filter.q.toSearch();

	if (!filter.page)
		filter.page = 1;

	if (!filter.limit)
		filter.limit = 1000;

	if (typeof(filter.page) === 'string')
		filter.page = +filter.page;

	if (typeof(filter.limit) === 'string')
		filter.limit = +filter.limit;

	var arr = [];
	var take = filter.limit;
	var skip = (filter.page - 1) * take;
	var count = 0;

	for (var i = 0; i < G.users.length; i++) {
		var user = G.users[i];

		if (filter.appid && (!user.apps || !user.apps[filter.appid]))
			continue;

		if (filter.q && user.search.indexOf(filter.q) === -1)
			continue;

		if (filter.group && (!user.groups || user.groups.indexOf(filter.group) === -1))
			continue;

		if (filter.role && (!user.roles || user.roles.indexOf(filter.role) === -1))
			continue;

		if (filter.ou && (!user.ougroups || user.ougroups.indexOf(filter.ou) === -1))
			continue;

		if (filter.locality && user.locality !== filter.locality)
			continue;

		if (filter.company && user.company !== filter.company)
			continue;

		if (filter.gender && user.gender !== filter.gender)
			continue;

		if (filter.customer && !user.customer)
			continue;

		count++;

		if (skip > 0) {
			skip--;
			continue;
		}

		take--;

		if (take <= 0)
			break;

		arr.push(user);
	}

	var data = {};
	data.items = arr;
	data.limit = data.count = data.items.length;
	data.page = filter.page;
	data.pages = Math.ceil(count / filter.limit);
	data.count = count;
	callback(null, data);
};

FUNC.users.rem = function(id, callback) {

	var index = G.users.findIndex('id', id);
	var item = G.users[index];

	if (index !== -1) {

		G.users.splice(index, 1);

		for (var i = 0, length = G.users.length; i < length; i++) {
			var tmp = G.users[i];
			if (tmp.supervisorid === id)
				tmp.supervisorid = '';
			if (tmp.delegateid === id)
				tmp.delegateid = '';
		}

		// Removes notifications
		Fs.unlink(F.path.databases('notifications_' + item.id + '.json'), NOOP);

		// Backup users
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
	callback(null, G.users.findItem('login', login));
};

FUNC.users.online = function(user, is, callback) {
	user.online = is;
	callback && callback(null);
};

// Codelist of from users
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

	// G.meta === important, is used as a cache
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

// Assigns app according to the model (filter)
FUNC.users.assign = function(model, callback) {

	// { "appid": '', roles: [] }

	var users = G.users;
	var count = 0;
	var updated = [];
	var ou = model.ou ? OP.ou(model.ou) : null;

	for (var i = 0, length = users.length; i < length; i++) {
		var user = users[i];
		if (ou && (!user.ougroups || !user.ougroups[ou]))
			continue;
		if (model.company && user.company !== model.company)
			continue;
		if (model.group && user.groups.indexOf(model.group) === -1)
			continue;
		if (model.role && user.roles.indexOf(model.role) === -1)
			continue;
		if (model.gender && user.gender !== model.gender)
			continue;
		if (model.customer && !user.customer)
			continue;
		if (model.sa && !user.sa)
			continue;

		!user.apps[model.appid] && (user.apps[model.appid] = { roles: [] });
		user.apps[model.appid].roles = model.roles;
		// user.apps[model.appid].settings = app.settings;
		updated.push(user);
		count++;
	}

	updated.wait(function(id, next) {
		// Notifies user about change
		FUNC.emit('users.refresh', id);
		setImmediate(next);
	});

	count && save(2);
	callback(null, count);
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

FUNC.apps.query = function(filter, callback) {
	// filter.page
	// filter.limit
	// filter.id {String Array}

	if (filter.q)
		filter.q = filter.q.toSearch();

	if (!filter.page)
		filter.page = 1;

	if (!filter.limit)
		filter.limit = 1000;

	if (typeof(filter.page) === 'string')
		filter.page = +filter.page;

	if (typeof(filter.limit) === 'string')
		filter.limit = +filter.limit;

	var arr = [];
	var take = filter.limit;
	var skip = (filter.page - 1) * take;
	var count = 0;

	for (var i = 0; i < G.apps.length; i++) {
		var app = G.apps[i];

		if (filter.id && filter.id.indexOf(app.id) === -1)
			continue;

		count++;

		if (skip > 0) {
			skip--;
			continue;
		}

		take--;

		if (take <= 0)
			break;

		arr.push(app);
	}

	var data = {};
	data.items = arr;
	data.limit = data.count = data.items.length;
	data.page = filter.page;
	data.pages = Math.ceil(count / filter.limit);
	data.count = count;
	callback(null, data);
};

// Internal service for refreshing meta info of all registered applications
// This functionality can do some service in special cases
ON('service', function(counter) {

	if (counter % 3 !== 0)
		return;

	// Each 3 minutes is executes refreshing
	refresh_apps();
});

function refresh_apps() {
	G.apps.wait(function(app, next) {
		OP.refresh(app, function(err, item) {

			// item == app (same object)

			// Good to know:
			// This is not needed because OP uses references in this case
			// This fields are as info for another storage
			// FUNC.apps.set(item, ['hostname', 'online', 'version', 'name', 'description', 'author', 'icon', 'frame', 'email', 'roles', 'groups', 'width', 'height', 'resize', 'type', 'screenshots', 'origin', 'daterefreshed']);

			// Important
			FUNC.emit('apps.sync', item.id);

			// Next app
			next();
		});

	}, () => FUNC.emit('apps.refresh'));
}

// ====================================
// Sessions
// ====================================

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
		callback(null, ('[' + body.substring(0, body.length - 1) + ']').parseJSON());
	});
};

// ====================================
// Files
// ====================================

// "backgrounds" are stored in /public/backgrounds/{id}.ext
// "photos" are stored in /public/photos/{id}.jpg
// if you want to use own file handler just create a custom FILE() route

FUNC.files.uploadphoto = function(base64, callback) {
	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.jpg';
	var path = F.path.public('photos');
	F.path.mkdir(path);
	base64.base64ToFile(U.join(path, id), () => callback(null, id));
};

FUNC.files.uploadbackground = function(httpfile, callback) {
	var path = F.path.public('backgrounds');
	F.path.mkdir(path);
	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.' + U.getExtension(httpfile.filename);
	httpfile.move(U.join(path, id), () => callback(null, id));
};

FUNC.files.removephoto = function(id) {
	var path = 'photos/' + id;
	Fs.unlink(F.path.public(path), NOOP);
	F.touch('/' + path);
};

FUNC.files.removebackground = function(id) {
	var path = 'backgrounds/' + id;
	Fs.unlink(F.path.public(path), NOOP);
	F.touch('/' + path);
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
			refresh_apps();
		});
	});
};

FUNC.emit = function(type, a, b, c, d, e) {
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