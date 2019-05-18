require('dbms').init(CONF.database, null, ERROR('DBMS'));

const Fs = require('fs');

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

var MODEL_FAVORITE = {};
var MODEL_VERSION = {};
var MODEL_NOTIFICATIONS = {};
var MODEL_BADGES = {};

FUNC.users.set = function(user, fields, callback, app, type) {

	// @user {Object}
	// @fields {String Array} Optional, changed fields
	// @callback {Function} Optional
	// @app {Object} Optional, app instance (can contain an app when the count of notifications/badges is updated)
	// @type {String} Optional, a type of update for apps

	user = CLONE(user);

	var apps = user.apps;
	var db = DBMS();

	// console.log(user.name, 'set -->', fields);

	if (user.id) {

		if (fields && fields.length === 1 && fields[0] === 'apps') {

			// APP IS HERE
			// ONLY APPS

			if (type === 'favorite') {
				MODEL_FAVORITE.favorite = app.favorite;
				db.modify('tbl_user_app', MODEL_FAVORITE).where('id', user.id + app.id);
				callback && db.callback(callback);
				return;
			}

			if (type === 'version') {
				MODEL_VERSION.version = app.version;
				db.modify('tbl_user_app', MODEL_VERSION).where('id', user.id + app.id);
				callback && db.callback(callback);
				return;
			}

			// FALLBACK
			// NOTHING TO DO
			callback && callback();
			return;
		}

		var builder = db.read('tbl_user');
		var index = -1;

		builder.where('id', user.id).orm();

		if (fields && fields.length) {
			for (var i = 0; i < fields.length; i++) {
				if (fields[i] === 'apps') {
					index = i;
					break;
				}
			}
			if (index !== -1)
				fields.splice(index, 1);
			builder.fields.apply(builder, fields);
		}

		builder.callback(function(err, response) {

			if (fields && fields.length) {
				for (var i = 0; i < fields.length; i++)
					response[fields[i]] = user[fields[i]];
			} else
				response.dbms.copy(user);

			delete response.apps;

			if (!app && (fields === null || index !== -1) && user.apps) {

				db.find('tbl_user_app').where('userid', user.id).data(function(response) {

					for (var i = 0; i < response.length; i++) {
						var dbapp = response[i];
						if (apps[dbapp.id]) {
							db.modify('tbl_user_app', { settings: apps[dbapp.id].settings, roles: apps[dbapp.id].roles, dtupdated: NOW }).where('id', dbapp.id);
							delete apps[app.id];
						} else
							db.remove('tbl_user_app').where('id', dbapp.id);
					}

					var keys = Object.keys(apps);
					for (var i = 0; i < keys.length; i++) {
						var key = keys[i];
						var userapp = apps[key];
						db.insert('tbl_user_app', { id: user.id + key, userid: user.id, appid: key, roles: userapp.roles, settings: userapp.settings, notifications: userapp.notifications == null ? true : userapp.notifications, dtcreated: NOW });
					}
				});

			} else if (fields && app) {

				// update specific app
				switch (type) {
					case 'notify': // notifications
						MODEL_NOTIFICATIONS.dtnotified = apps[app.id].dtnotified;
						MODEL_NOTIFICATIONS.countnotifications = apps[app.id].countnotifications;
						db.modify('tbl_user_app', MODEL_NOTIFICATIONS).where('id', user.id + app.id);
						break;
					case 'badge':  // badges
						MODEL_BADGES.countbadges = apps[app.id].countbadges;
						db.modify('tbl_user_app', MODEL_BADGES).where('id', user.id + app.id);
						break;
				}
			}

			response.dbms.save();
			callback && db.callback(() => callback(null, user.id));
		});

	} else {

		user.id = UID();

		delete user.apps;
		db.insert('tbl_user', user);

		var keys = Object.keys(apps);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var app = CLONE(apps[key]);
			app.userid = user.id;
			app.appid = key;
			db.insert('tbl_user_app', app);
		}

		if (callback)
			db.callback(() => callback(null, user.id));
	}

};

FUNC.users.get = function(id, callback) {
	var reference = id[0] === '@';
	DBMS().read('tbl_user').where(reference ? 'reference' : 'id', reference ? id.substring(1) : id).callback(function(err, response) {
		if (response)
			readapps(response, callback);
		else
			callback(null, response);
	});
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
		filter.limit = 500;

	if (filter.limit > 1000)
		filter.limit = 1000;

	if (typeof(filter.page) === 'string')
		filter.page = +filter.page;

	if (typeof(filter.limit) === 'string')
		filter.limit = +filter.limit;

	// Removed users
	if (filter.removed) {
		var builder = DBMS().list('tbl_user_removed');
		filter.modified && builder.where('dtcreated', '>', NOW.add('-' + filter.modified));
		builder.paginate(filter.page, filter.limit);
		builder.callback(callback);
		return;
	}

	if (filter.directory) {
		// Is number?
		if ((/^\d+$/g).test(filter.directory)) {
			filter.directoryid = +filter.directory;
			filter.directory = null;
		}
	}

	if (filter.modified)
		filter.modified = NOW.add('-' + filter.modified);

	if (filter.logged)
		filter.logged = NOW.add('-' + filter.logged);

	var builder = DBMS().list(filter.appid ? 'view_userapp' : 'tbl_user');

	filter.id && builder.in('id', filter.id);
	filter.directory && builder.where('directory', filter.directory);
	filter.directoryid && builder.where('directoryid', filter.directoryid);
	filter.locality && builder.where('locality', filter.locality);
	filter.position && builder.where('position', filter.position);
	filter.groupid && builder.where('groupid', filter.groupid);
	filter.company && builder.where('company', filter.company);
	filter.gender && builder.where('gender', filter.gender);
	filter.statusid && builder.where('statusid', filter.statusid);
	filter.customer && builder.query('customer=TRUE');
	filter.q && builder.search('search', filter.q);
	filter.group && builder.query('$1=ANY (groups)', [filter.group]);
	filter.role && builder.query('$1=ANY (roles)', [filter.role]);
	filter.ou && builder.query('$1=ANY (ougroups)', [filter.ou]);
	filter.modified && builder.where('dtmodified', '>', filter.modified);
	filter.logged && builder.where('dtlogged', '<', filter.logged);
	filter.online && builder.query('online', true);
	filter.appid && builder.where('appid', filter.appid);

	builder.paginate(filter.page, filter.limit);
	builder.callback(callback);
};

FUNC.users.rem = function(id, callback) {
	var db = DBMS();

	db.read('tbl_user').where('id', id).callback(function(err, response) {
		if (response) {
			db.insert('tbl_user_removed', { id: id, reference: response.reference, groupid: response.groupid, dtcreated: NOW });
			db.modify('tbl_user', { supervisorid: null }).where('supervisorid', id);
			db.modify('tbl_user', { deputyid: null }).where('deputyid', id);

			// Removes data
			db.remove('tbl_user').where('id', id).callback(() => callback(null, response));

		} else
			callback();
	});
};

function readapps(user, callback) {
	DBMS().find('tbl_user_app').where('userid', user.id).fields('appid,roles,settings,notifications,countnotifications,countbadges').callback(function(err, response) {

		var apps = {};

		for (var i = 0; i < response.length; i++) {
			var app = response[i];
			apps[app.appid] = app;
			delete app.appid;
		}

		user.apps = apps;
		callback(null, user);
	});
}

FUNC.users.login = function(login, password, callback) {
	DBMS().read('tbl_user').where('login', login).callback(function(err, response) {
		if (response && response.password === password.sha256()) {
			delete response.password;
			readapps(response, callback);
		} else
			callback();
	});
};

FUNC.users.logout = function(user, controller, noredirect) {
	if (!noredirect)
		controller.redirect('/');
};

FUNC.users.password = function(login, callback) {
	DBMS().read('tbl_user').where('login', login).callback(callback);
};

var MODEL_IS_ONLINE = {};

FUNC.users.online = function(user, is, callback) {
	MODEL_IS_ONLINE.online = is;
	DBMS().modify('tbl_user', MODEL_IS_ONLINE).where('id', user.id);
	user.online = is;
	callback && callback(null);
};

// Codelist of from users
FUNC.users.meta = function(callback, directory) {

	var remove = function(item) {
		return !item.name;
	};

	var prepare = function(arr, isou) {
		for (var i = 0; i < arr.length; i++) {
			arr[i].id = arr[i].name;
			if (isou)
				arr[i].name = arr[i].name.replace(/\//g, ' / ');
		}
		arr = arr.remove(remove);
		return arr;
	};

	var db = DBMS();
	var arg = directory ? [directory || ''] : undefined;
	var plus = directory ? ' WHERE directory=$1' : '';
	var plus2 = directory ? ' directory=$1 AND' : '';

	db.query('SELECT locality as name, COUNT(1) as count FROM tbl_user' + plus + ' GROUP BY locality ORDER BY 1', arg).set('localities');
	db.query('SELECT position as name, COUNT(1) as count FROM tbl_user' + plus + ' GROUP BY position ORDER BY 1', arg).set('positions');
	db.query('SELECT company as name, COUNT(1) as count FROM tbl_user WHERE' + plus2 + ' customer=TRUE GROUP BY company ORDER BY 1', arg).set('customers');
	db.query('SELECT company as name, COUNT(1) as count FROM tbl_user WHERE' + plus2 + ' customer=FALSE GROUP BY company ORDER BY 1', arg).set('companies');
	db.query('SELECT directory as name, COUNT(1) as count FROM tbl_user' + plus + ' GROUP BY directory ORDER BY 1', arg).set('directories');
	db.query('SELECT unnest(ougroups) as name, COUNT(1) as count FROM tbl_user' + plus + ' GROUP BY unnest(ougroups) ORDER BY 1', arg).set('ou');
	db.query('SELECT unnest(groups) as name, COUNT(1) as count FROM tbl_user' + plus + ' GROUP BY unnest(groups) ORDER BY 1', arg).set('groups');

	if (directory)
		db.query('SELECT unnest(roles) as name, COUNT(1) as count FROM tbl_user WHERE directory=$1 GROUP BY unnest(roles) ORDER BY name', arg).set('roles');
	else
		db.query('SELECT name, COUNT(1) as count FROM (SELECT unnest(roles) as name, COUNT(1) as count FROM tbl_user GROUP BY unnest(roles) UNION ALL SELECT unnest(roles) as name, 0 as count FROM tbl_app GROUP BY unnest(roles)) as usersapps GROUP BY name ORDER BY name', arg).set('roles');

	db.callback(function(err, response) {

		var meta = {};
		meta.localities = prepare(response.localities);
		meta.positions = prepare(response.positions);
		meta.customers = prepare(response.customers);
		meta.companies = prepare(response.companies);
		meta.directories = prepare(response.directories);
		meta.groups = prepare(response.groups);
		meta.roles = prepare(response.roles);
		meta.ou = prepare(response.ou, true);
		meta.languages = CONF.languages;

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

	});
};

// Assigns app according to the model (filter)
FUNC.users.assign = function(model, callback) {

	// { "appid": '', roles: [] }

	var sql = [];
	var ou = model.ou ? OP.ou(model.ou) : null;
	var params = [model.appid, model.roles];

	var add = function(cmd, value) {
		var index = params.push(value);
		sql.length && sql.push(' AND ');
		if (value == null)
			sql.push(cmd);
		else
			sql.push(cmd.replace('$', '$' + index));
	};

	ou && add('$=ANY (ougroups)', ou);
	model.company && add('company=$', model.company);
	model.locality && add('locality=$', model.locality);
	model.position && add('position=$', model.position);
	model.language && add('language=$', model.language);
	model.directory && add('directory=$', model.directory);
	model.group && add('$=ANY (groups)', model.group);
	model.role && add('$=ANY (roles)', model.role);
	model.gender && add('gender=$', model.gender);
	model.customer && add('customer=TRUE');
	model.sa && add('sa=TRUE');

	var db = DBMS();
	db.query('WITH rows AS (UPDATE tbl_user_app SET roles=$2, dtupdated=NOW() WHERE appid=$1 AND userid IN (SELECT id FROM tbl_user' + (sql.length ? (' WHERE ' + sql.join('')) : '') + ') RETURNING 1) SELECT count(1)::int as count FROM rows LIMIT 1', params).set('e');
	db.query('WITH rows AS (INSERT INTO tbl_user_app (id,userid,appid,roles,settings,notifications,dtcreated) (SELECT id || $1, id, $1, $2, \'\', true, NOW() FROM tbl_user WHERE NOT EXISTS(SELECT 1 FROM tbl_user_app WHERE id=tbl_user.id || $1)' + (sql.length ? (' AND ' + sql.join('')) : '') + ') RETURNING 1) SELECT count(1)::int as count FROM rows LIMIT 1', params).set('n');

	db.callback(function(err, response) {
		var count = (response.n && response.n.length ? response.n[0].count : 0) + (response.e && response.e.length ? response.e[0].count : 0);
		FUNC.emit('users.refresh', null, 'apps');

		// Releases all sessions
		OP.session.release(null);
		callback(null, count);
	});
};

// ====================================
// Apps
// ====================================

FUNC.apps.get = function(id, callback) {
	DBMS().read('tbl_app').where('id', id).callback(callback);
};

FUNC.apps.set = function(app, fields, callback) {
	var db = DBMS();
	if (app.id) {
		db.read('tbl_app').where('id', app.id).orm().callback(function(err, response) {
			if (response) {
				response.dbms.copy(app);
				if (callback)
					response.dbms.save(() => callback(null, app.id));
				else
					response.dbms.save();
			} else if (callback)
				callback();
		});
	} else {
		app.id = UID();
		db.insert('tbl_app', app).callback(() => callback(app.id));
	}
};

FUNC.apps.rem = function(id, callback) {
	var db = DBMS();
	db.read('tbl_app').where('id', id).callback(function(err, response) {
		response && db.remove('tbl_app').where('id', id);
		callback(err, response);
	});
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

	var builder = DBMS().list('tbl_app');
	filter.id && builder.in('id', filter.id);
	filter.q && builder.search('search', filter.q);
	filter.directory && builder.query('$1=ANY (directories)', [filter.directory]);
	filter.guest && builder.query('(allowguestuser=TRUE AND guest=TRUE)');
	builder.sort('title');
	builder.paginate(filter.page, filter.limit);
	builder.callback(callback);
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
	DBMS().find('tbl_app').callback(function(err, response) {
		response.wait(function(app, next) {
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
	});
}

// ====================================
// Settings
// ====================================

FUNC.settings.get = function(callback) {
	DBMS().read('tbl_settings').where('id', 'openplatform').callback(function(err, response) {
		callback(null, response ? response.body : {});
	});
};

FUNC.settings.set = function(data, callback) {
	DBMS().modify('tbl_settings', { body: data, dtupdated: NOW }, true).insert(function(item) {
		item.dtcreated = NOW;
	}).where('id', 'openplatform');
	callback && callback(null);
};

// ====================================
// Configs
// ====================================

FUNC.configs.get = function(userid, appid, callback) {
	DBMS().read('tbl_config').where('id', userid + appid).callback(function(err, response) {
		callback(err, response ? response.body : null);
	});
};

FUNC.configs.set = function(userid, appid, data, callback) {
	var builder = DBMS().modify('tbl_config', { body: data, dtupdated: NOW }, true).where('id', userid + appid).insert(function(item) {
		item.id = userid + appid;
		item.userid = userid;
		item.appid = appid;
		item.dtcreated = NOW;
	});
	callback && builder.callback(callback);
};

FUNC.configs.rem = function(userid, appid, callback) {
	var builder = DBMS().remove('tbl_config').where('id', userid + appid);
	callback && builder.callback(callback);
};

// ====================================
// Badges
// ====================================

var MODEL_BADGES_RESET = { countbadges: 0 };

FUNC.badges.rem = function(userid, appid, callback) {
	DBMS().modify('tbl_user_app', MODEL_BADGES_RESET).where('id', userid + appid);
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

	data.id = UID();
	data.userappid = data.userid + data.appid;
	DBMS().insert('tbl_notification', data);
	callback && callback();
};

var MODEL_NOTIFICATIONS_RESET = { countnotifications: 0 };

FUNC.notifications.rem = function(userid, callback) {
	var db = DBMS();
	db.remove('tbl_notification').where('userid', userid);
	db.modify('tbl_user', MODEL_NOTIFICATIONS_RESET).where('id', userid);
	db.modify('tbl_user_app', MODEL_NOTIFICATIONS_RESET).where('userid', userid);
	callback && callback();
};

FUNC.notifications.get = function(userid, callback) {
	DBMS().find('tbl_notification').where('userid', userid).callback(callback);
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
	DBMS().modify('tbl_user', { online: false }).where('online', true);
	FUNC.users.meta();
	callback && callback();
	refresh_apps();
};

FUNC.emit = EMIT;
FUNC.on = ON;

FUNC.error = function(place, err) {
	F.error(err, null, place);
};

FUNC.log = function(user, appid, type, body) {
	DBMS().insert('tbl_log', { userid: user.id, appid: appid, type: type, body: body, dtcreated: NOW });
};

FUNC.logger = function(type, message, user, ip) {
	DBMS().insert('tbl_logger', { type: type, message: message.max(200), username: user, ip: ip, dtcreated: NOW });
};