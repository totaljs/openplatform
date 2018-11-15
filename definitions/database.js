const Fs = require('fs');
require('dbms').init(CONF.database);

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
	var is = true;

	if (user instanceof Array) {
		for (var j = 0; j < user.length; j++) {
			var data = {};
			for (var i = 0; i < fields.length; i++)
				data[fields[i]] = user[j][fields[i]];
			db.modify('tbl_user', data).where('id', user[j].id);
			is = false;
		}

		if (is) {
			callback(null);
			return;
		}

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
	DBMS().read('tbl_user').where('id', id).callback(function(err, response) {
		if (response) {
			var db = DBMS();
			db.remove('tbl_user').where('id', id);
			db.update('tbl_user', { supervisorid: '' }).where('supervisorid', id);
			db.update('tbl_user', { delegateid: '' }).where('delegateid', id);
			db.remove('tbl_notification').where('userid', id);
		}
		callback(null, response);
	});
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
	FUNC.sessions.rem(user.id);
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

FUNC.users.stream = function(query, fn, callback) {

	// Streams all users
	// fn(users, next);
	// done: callback()

	if (!query.limit)
		query.limit = 100;

	if (typeof(query.limit) === 'string')
		query.limit = +query.limit;

	var streamer = function(index) {
		var builder = DBMS().find('tbl_user');
		query.appid && builder.search('apps::text', '"{0}"'.format(query.appid));
		builder.take(query.limit);
		builder.skip(query.limit * index);
		builder.callback(function(err, response) {
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

			if (data.roles)
				data.roles = JSON.stringify(data.roles);

			db.modify('tbl_app', data).where('id', app.id);
		} else {

			if (app.roles)
				app.roles = JSON.stringify(app.roles);

			db.modify('tbl_app', app).where('id', app.id);
		}
	} else {
		app.id = UID();
		if (app.roles)
			app.roles = JSON.stringify(app.roles);
		db.insert('tbl_app', app);
	}

	callback && db.callback(err => callback(err, app.id));
};

FUNC.apps.rem = function(id, callback) {
	DBMS().read('tbl_app').where('id', id).callback(function(err, response) {
		if (response) {

			var db = DBMS();
			db.remove('tbl_app').where('id', id);
			db.remove('tbl_notification').where('appid', id);

			// Remove app
			FUNC.users.stream({ limit: 50, appid: id }, function(users, next) {
				for (var i = 0; i < users.length; i++)
					delete users[i].apps[id];

				if (users.length)
					FUNC.users.set(users, ['apps'], next);
				else
					next();

			}, () => callback(null, response));

		} else
			callback(null);
	});
};

FUNC.apps.stream = function(query, fn, callback) {

	// Streams all apps
	// fn(users, next);
	// done: callback()

	if (!query.limit)
		query.limit = 100;

	if (typeof(query.limit) === 'string')
		query.limit = +query.limit;

	var streamer = function(index) {
		var builder = DBMS().find('tbl_app');
		builder.take(query.limit);
		builder.skip(query.limit * index);
		builder.callback(function(err, response) {
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

	data.id = UID();
	DBMS().insert('tbl_notification', data);
	callback && callback();
};

FUNC.notifications.rem = function(userid, callback) {

	var db = DBMS();

	db.remove('tbl_notification').where('userid', userid);
	db.modify('tbl_user', { countnotifications: 0 }).where('id', userid);
	db.read('tbl_user').where('id', userid).fields('apps').callback(function(err, user) {

		if (user) {

			var keys = Object.keys(user.apps);

			for (var i = 0; i < keys.length; i++)
				user.apps[keys[i]].countnotifications = 0;

			if (keys.length)
				db.modify('tbl_user', user).where('id', userid);
		}

	});

	db.callback(callback);
};

FUNC.notifications.get = function(userid, callback) {
	// Reads notifications + remove it
	DBMS().find('tbl_notification').where('userid', userid).callback(callback);
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