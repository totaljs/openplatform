const Fs = require('fs');
require('dbms').init('postgres://totalsqlagent:B669fD02452Baa4b@138.201.86.196/openplatform');

//DBMS.logger();

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

	var db = DBMS();

	if (user instanceof Array) {
		for (var j = 0; i < user.length; j++) {
			var data = {};
			for (var i = 0; i < fields.length; i++)
				data[fields[i]] = user[j][fields[i]];
			db.modify('tbl_user', data).where('id', user[j].id);
		}
		db.callback(callback);
	} else if (user.id) {
		if (fields) {
			var data = {};
			for (var i = 0; i < fields.length; i++)
				data[fields[i]] = user[fields[i]];
			db.modify('tbl_user', data).where('id', user.id);
		} else
			db.modify('tbl_user', user).where('id', user.id);
	} else {
		user.id = UID();
		db.insert('tbl_user', user);
	}

	callback && db.callback(err => callback(err, user.id));
};

FUNC.users.get = function(id, callback) {
	// Finds a user by ID
	DBMS().read('tbl_user').where('id', id).callback(callback);
};

FUNC.users.query = function(filter, callback) {

	// filter.page
	// filter.limit
	// filter.appid

	var db = DBMS();
	var builder = db.listing('tbl_user');

	filter.appid && builder.search('apps::text', '"{0}"'.format(filter.appid));
	builder.paginate(filter.page, filter.limit, 100);
	builder.callback(callback);
};

FUNC.users.rem = function(id, callback) {
	// @TODO: complete + remove all notifications
	callback(null);
};

FUNC.users.login = function(login, password, callback) {
	DBMS().read('tbl_user').where('login', login).callback(function(err, response) {
		if (response && response.password.sha256() === password)
			callback(null, response);
		else
			callback();
	});
};

FUNC.users.logout = function(user, controller) {
	controller.redirect('/');
};

FUNC.users.password = function(login, callback) {
	DBMS().read('tbl_user').where('login', login).callback(function(err, response) {
		if (response)
			callback(null, response);
		else
			callback();
	});
};

FUNC.users.stream = function(limit, fn, callback) {

	// Streams all users
	// fn(users, next);
	// done: callback()

	var streamer = function(index) {
		DBMS().find('tbl_user').take(limit).skip(limit * index).callback(function(err, response) {
			if (err || !response.length)
				callback && callback();
			else
				fn(response, () => streamer(index + 1));
		});
	};

	streamer(0);
};

FUNC.users.online = function(user, is, callback) {
	user.online = is;
	callback && callback(null);
};

// Codelist
FUNC.users.meta = function(callback) {

	var db = DBMS();
	db.query('SELECT locality, count(1) FROM tbl_user GROUP BY locality').set('locality');
	db.query('SELECT company, customer, count(1) FROM tbl_user GROUP BY company, customer').set('company');
	db.query('SELECT ougroups::text, count(1) FROM tbl_user GROUP BY ougroups::text').set('ougroups');
	db.query('SELECT groups::text, count(1) FROM tbl_user GROUP BY groups::text').set('groups');
	db.query('SELECT roles::text, count(1) FROM tbl_user GROUP BY roles::text').set('roles');

	db.callback(function(err, item) {

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

		if (item.ougroups && item.ougroups.length) {
			for (var i = 0; i < item.ougroups.length; i++) {
				var item_ougroups = item.ougroups[i].ougroups;
				var ougroups = item_ougroups ? Object.keys(item_ougroups.parseJSON()) : EMPTYARRAY;
				for (var j = 0; j < ougroups.length; j++) {
					var oukey = ougroups[j];
					if (ou[oukey])
						ou[oukey].count++;
					else
						ou[oukey] = { count: 1, name: oukey };
				}
			}
		}

		if (item.groups && item.groups.length) {
			for (var i = 0; i < item.groups.length; i++) {
				var item_groups = item.groups[i].groups.parseJSON();
				for (var j = 0; j < item_groups.length; j++) {
					var g = item_groups[j];
					if (groups[g])
						groups[g].count++;
					else
						groups[g] = { count: 1, id: g, name: g };
				}
			}
		}

		if (item.roles && item.roles.length) {
			for (var i = 0; i < item.roles.length; i++) {
				var item_roles = item.roles[i].roles.parseJSON();
				for (var j = 0; j < item_roles.length; j++) {
					var r = item_roles[j];
					if (roles[r])
						roles[r].count++;
					else
						roles[r] = { count: 1, id: r, name: r };
				}
			}
		}

		if (item.locality && item.locality.length) {
			for (var i = 0; i < item.locality.length; i++) {
				var item_locality = item.locality[i].locality;
				if (localities[item_locality])
					localities[item_locality].count++;
				else
					localities[item_locality] = { count: 1, id: item_locality.slug(), name: item_locality };
			}
		}

		if (item.company && item.company.length) {
			for (var i = 0; i < item.company.length; i++) {
				var item_company = item.company[i];
				var name_company = item_company.company;

				if (item_company.customer) {
					if (customers[name_company])
						customers[name_company].count++;
					else
						customers[name_company] = { count: 1, id: name_company.slug(), name: name_company };
				} else {
					if (companies[name_company])
						companies[name_company].count++;
					else
						companies[name_company] = { count: 1, id: name_company.slug(), name: name_company };
				}
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
	});
};

// ====================================
// Apps
// ====================================

FUNC.apps.get = function(id, callback) {
	// Finds a user by ID
	DBMS().read('tbl_app').where('id', id).callback(callback);
};

FUNC.apps.set = function(app, fields, callback) {

	var db = DBMS();

	if (app.id) {
		if (fields) {
			var data = {};
			for (var i = 0; i < fields.length; i++)
				data[fields[i]] = app[fields[i]];
			db.modify('tbl_app', data).where('id', app.id);
		} else
			db.modify('tbl_app', app).where('id', app.id);
	} else {
		app.id = UID();
		db.insert('tbl_app', app);
	}

	callback && db.callback(err => callback(err, app.id));
};

FUNC.apps.rem = function(id, callback) {
	// @TODO: complete + remove all notifications
	callback(null);
};

FUNC.apps.stream = function(limit, fn, callback) {

	// Streams all apps
	// fn(users, next);
	// done: callback()

	var streamer = function(index) {
		DBMS().find('tbl_app').take(limit).skip(limit * index).callback(function(err, response) {
			if (err || !response.length)
				callback && callback();
			else
				fn(response, () => streamer(index + 1));
		});
	};

	streamer(0);
};

FUNC.apps.query = function(filter, callback) {
	// filter.page
	// filter.limit
	// filter.id {String Array}
	var builder = DBMS().listing('tbl_app');
	filter.id && builder.in('id', filter.id);
	builder.paginate(filter.page, filter.limit, 100);
	builder.callback(callback);
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
	DBMS().read('tbl_settings').where('id', 'openplatform').callback(function(err, response) {
		callback(null, response ? response.data : {});
	});
};

FUNC.settings.set = function(data, callback) {
	DBMS().modify('tbl_settings', { data: data }).where('id', 'openplatform').callback(callback);
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
	FUNC.users.meta(callback);
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