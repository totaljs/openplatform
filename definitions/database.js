const Fs = require('fs');
const REG_OU_REPLACE = /\//g;
const REG_OU_REPLACE2 = /\s\/\s/g;

CONF.table_configs = 'userid:string|appid:string|body:string|dtupdated:date|dtcreated:date';
FUNC.apps = {};
FUNC.users = {};
FUNC.settings = {};
FUNC.notifications = {};
FUNC.files = {};
FUNC.badges = {};
FUNC.configs = {};

// ====================================
// Users
// ====================================

FUNC.users.set = function(user, fields, callback, app, type) {

	// @user {Object}
	// @fields {String Array} Optional, changed fields
	// @callback {Function} Optional
	// @app {Object} Optional, app instance (can contain an app when the count of notifications/badges is updated)
	// @type {String} Optional, a type of update for apps

	if (user.id) {
		var item = G.users.findItem('id', user.id);
		item && U.extend(user, item);
	} else {

		if (typeof(user) === 'string')
			throw new Error('USER IS STRING');

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

	if (typeof(filter.id) === 'string')
		filter.id = filter.id.split(',');

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

	// Removed users
	if (filter.removed) {
		var builder = NOSQL('removed').list();
		filter.modified && builder.where('dtcreated', '>', NOW.add('-' + filter.modified));
		builder.paginate(filter.page, filter.limit);
		builder.callback(callback);
		return;
	}

	var arr = [];
	var take = filter.limit;
	var skip = (filter.page - 1) * take;
	var count = 0;

	if (filter.directory) {
		// Is number?
		if ((/^\d+$/g).test(filter.directory)) {
			filter.directoryid = +filter.directory;
			filter.directory = null;
		}
	}

	if (filter.blocked && typeof(filter.blocked) === 'string')
		filter.blocked = filter.blocked === 'true';

	if (filter.inactive && typeof(filter.inactive) === 'string')
		filter.inactive = filter.inactive === 'true';

	if (filter.active && typeof(filter.active) === 'string')
		filter.active = filter.active === 'true';

	if (filter.customer && typeof(filter.customer) === 'string')
		filter.customer = filter.customer === 'true';

	if (filter.sa && typeof(filter.sa) === 'string')
		filter.sa = filter.sa === 'true';

	if (filter.online && typeof(filter.online) === 'string')
		filter.online = filter.online === 'true';

	if (filter.modified)
		filter.modified = NOW.add('-' + filter.modified);

	if (filter.logged)
		filter.logged = NOW.add('-' + filter.logged);

	if (filter.statusid)
		filter.statusid = +filter.statusid;

	if (filter.ou)
		filter.ou = filter.ou.replace(REG_OU_REPLACE2, '/');

	for (var i = 0; i < G.users.length; i++) {
		var user = G.users[i];

		if (filter.id && filter.id.indexOf(user.id) === -1)
			continue;

		if (filter.appid && (!user.apps || !user.apps[filter.appid]))
			continue;

		if (filter.directory && user.directory !== filter.directory)
			continue;

		if (filter.directoryid && user.directoryid !== filter.directoryid)
			continue;

		if (filter.locality && user.locality !== filter.locality)
			continue;

		if (filter.position && user.position !== filter.position)
			continue;

		if (filter.groupid && user.groupid !== filter.groupid)
			continue;

		if (filter.company && user.company !== filter.company)
			continue;

		if (filter.gender && user.gender !== filter.gender)
			continue;

		if (filter.statusid >= 0 && user.statusid !== filter.statusid)
			continue;

		if (filter.language && user.language !== filter.language)
			continue;

		if (filter.customer && !user.customer)
			continue;

		if (filter.active && user.inactive)
			continue;

		if (filter.inactive && !user.inactive)
			continue;

		if (filter.blocked && !user.blocked)
			continue;

		if (filter.sa && !user.sa)
			continue;

		if (filter.q && user.search.indexOf(filter.q) === -1)
			continue;

		if (filter.group && (!user.groups || user.groups.indexOf(filter.group) === -1))
			continue;

		if (filter.role && (!user.roles || user.roles.indexOf(filter.role) === -1))
			continue;

		if (filter.ou && (!user.ougroups || user.ougroups.indexOf(filter.ou) === -1))
			continue;

		if (filter.modified && !((user.dtmodified && user.dtmodified > filter.modified) || (user.dtcreated > filter.modified)))
			continue;

		if (filter.online && !user.online)
			continue;

		if (filter.logged && user.dtlogged < filter.logged)
			continue;

		count++;

		if (skip > 0) {
			skip--;
			continue;
		}

		take--;

		if (take <= 0)
			continue;

		arr.push(user);
	}

	var data = {};
	data.items = arr;
	data.limit = filter.limit;
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
			if (tmp.deputyid === id)
				tmp.deputyid = '';
		}

		// Removes notifications
		Fs.unlink(F.path.databases('notifications_' + item.id + '.json'), NOOP);

		NOSQL('removed').insert({ id: id, reference: item.reference, dtcreated: NOW });

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

FUNC.users.logout = function(user, controller, noredirect) {
	if (!noredirect)
		controller.redirect('/');
};

FUNC.users.password = function(login, callback) {
	var user = G.users.findItem('login', login);
	if (user == null)
		user = G.users.findItem('email', login);
	callback(null, user);
};

FUNC.users.online = function(user, is, callback) {
	user.online = is;
	callback && callback(null);
};

// Codelist of from users
FUNC.users.meta = function(callback, directory) {

	var ou = {};
	var localities = {};
	var companies = {};
	var customers = {};
	var groups = {};
	var roles = {};
	var directories = {};
	var positions = {};
	var languages = {};

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

		if (directory && item.directory !== directory)
			continue;

		if (item.ougroups) {
			for (var j = 0; j < item.ougroups.length; j++) {
				var o = item.ougroups[j];
				if (ou[o])
					ou[o].count++;
				else
					ou[o] = { count: 1, name: o };
			}
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
				localities[item.locality] = { count: 1, id: item.locality, name: item.locality };
		}

		if (item.position) {
			if (positions[item.position])
				positions[item.position].count++;
			else
				positions[item.position] = { count: 1, id: item.position, name: item.position };
		}

		if (item.language) {
			if (languages[item.language])
				languages[item.language].count++;
			else
				languages[item.language] = { count: 1, id: item.language, name: item.language };
		}

		if (item.directory) {
			if (directories[item.directory])
				directories[item.directory].count++;
			else
				directories[item.directory] = { count: 1, id: item.directory.crc32(true), name: item.directory };
		}

		if (item.company) {
			if (item.customer) {
				if (customers[item.company])
					customers[item.company].count++;
				else
					customers[item.company] = { count: 1, id: item.company, name: item.company };
			}
			if (companies[item.company])
				companies[item.company].count++;
			else
				companies[item.company] = { count: 1, id: item.company, name: item.company };
		}
	}

	if (G.apps) {
		for (var i = 0, length = G.apps.length; i < length; i++) {
			var item = G.apps[i];
			if (item.roles && item.roles) {
				for (var j = 0; j < item.roles.length; j++) {
					var r = item.roles[j];
					if (!roles[r])
						roles[r] = { count: 1, id: r, name: r };
				}
			}
		}
	}

	// G.meta === important, is used as a cache

	var meta = {};
	meta.companies = toArray(companies);
	meta.customers = toArray(customers);
	meta.localities = toArray(localities);
	meta.positions = toArray(positions);
	meta.directories = toArray(directories);
	meta.groups = toArray(groups);
	meta.roles = toArray(roles);
	meta.languages = toArray(languages);
	meta.ou = toArray(ou, function(item) {
		item.id = item.name = item.name.replace(REG_OU_REPLACE, ' / ');
		return item;
	});

	if (directory) {
		G.metadirectories[directory] = meta;
		callback && callback(null, meta);
	} else {
		G.metadirectories = {};
		G.meta = meta;
		meta.directories.wait(function(item, next) {
			FUNC.users.meta(next, item.name);
		}, function() {
			callback && callback(null, meta);
		});
	}
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
		if (model.directory && user.directory !== model.directory)
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
		FUNC.emit('users.refresh', id, 'apps');
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

	if (!filter.page)
		filter.page = 1;

	if (!filter.limit)
		filter.limit = 1000;

	if (typeof(filter.id) === 'string')
		filter.id = filter.id.split(',');

	if (typeof(filter.page) === 'string')
		filter.page = +filter.page;

	if (typeof(filter.limit) === 'string')
		filter.limit = +filter.limit;

	if (filter.q)
		filter.q = filter.q.toSearch();

	var arr = [];
	var take = filter.limit;
	var skip = (filter.page - 1) * take;
	var count = 0;

	for (var i = 0; i < G.apps.length; i++) {
		var app = G.apps[i];

		if (filter.id && filter.id.indexOf(app.id) === -1)
			continue;

		if (filter.directory && app.directories && app.directories.length && app.directories.indexOf(filter.directory) === -1)
			continue;

		if (filter.guest && (!app.allowguestuser || !app.guest))
			continue;

		if (filter.q && app.search.indexOf(filter.q) === -1)
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
			// FUNC.apps.set(item, ['hostname', 'online', 'version', 'name', 'description', 'author', 'icon', 'frame', 'email', 'roles', 'groups', 'width', 'height', 'resize', 'type', 'screenshots', 'origin', 'dtsync']);

			// Important
			FUNC.emit('apps.sync', item.id);

			// Next app
			next();
		});

	}, () => FUNC.emit('apps.refresh'));
}

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
// Configs
// ====================================

FUNC.configs.get = function(userid, appid, callback) {
	TABLE('configs').one().where('userid', userid).where('appid', appid).callback(function(err, doc) {
		callback(err, doc ? doc.body : null);
	});
};

FUNC.configs.set = function(userid, appid, data, callback) {
	TABLE('configs').modify({ body: data, dtupdated: NOW }, true).where('userid', userid).where('appid', appid).insert(function(doc) {
		doc.userid = userid;
		doc.appid = appid;
		doc.dtcreated = NOW;
	}).first().callback(callback);
};

FUNC.configs.rem = function(userid, appid, callback) {
	TABLE('configs').where('userid', userid).where('appid', appid).first().callback(callback);
};

// ====================================
// Badges
// ====================================

FUNC.badges.rem = function(userid, appid, callback) {
	var user = G.users.findItem('id', userid);
	if (user) {
		if (user.apps[appid])
			user.apps[appid].countbadges = 0;
		save(2);
	}
	callback && callback();
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
	// data.dtcreated

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
		} else {
			var body = data.toString('utf8');
			callback(null, ('[' + body.substring(0, body.length - 1) + ']').parseJSON());
		}
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

		for (var i = 0, length = G.users.length; i < length; i++)
			G.users[i].online = false;

		Fs.readFile(F.path.databases('apps.json'), function(err, response) {
			G.apps = response ? response.toString('utf8').parseJSON(true) : [];

			for (var i = 0, length = G.apps.length; i < length; i++)
				G.apps[i].online = false;

			G.apps.quicksort('title');
			FUNC.users.meta();
			callback && callback();
			refresh_apps();
		});
	});
};

FUNC.emit = EMIT;
FUNC.on = ON;

FUNC.error = function(place, err) {
	F.error(err, null, place);
};

FUNC.log = function(user, appid, type, body) {
	NOSQL('logs').insert({ userid: user.id, appid: appid, type: type, body: body, dtcreated: NOW });
};

FUNC.logger = LOGGER;

// FileStorage
function save(type) {
	setTimeout2('OP.savestate.' + (type || 0), function() {

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