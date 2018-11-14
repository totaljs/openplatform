const Fs = require('fs');

FUNC.apps = {};
FUNC.users = {};
FUNC.sessions = {};
FUNC.common = {};
FUNC.settings = {};

// Users
FUNC.users.set = function(user, fields, callback) {

	// @user {Object/Object Array}
	// @fields {String Array} Optional, changed fields
	// @callback {Function} Optional

	OP.saveState(2);

	if (typeof(callback) === 'function')
		callback();
};

FUNC.users.get = function(id, callback) {
	// Finds a user by ID
	callback(null, G.users.findItem('id', id));
};

FUNC.users.query = function(filter, callback) {
	// filter.take
	// filter.skip
};

FUNC.users.stream = function(limit, fn, callback) {
	// Streams all users
	// fn(users, next);
	// done: callback()

	fn(G.users, NOOP);
	callback && callback();
};

FUNC.users.online = function(user, is, callback) {
	user.online = is;
	callback && callback(null);
};

// Apps
FUNC.apps.get = function(id, callback) {
	// Finds a user by ID
	callback(null, G.apps.findItem('id', id));
};

FUNC.apps.query = function(filter, callback) {
	// filter.take
	// filter.skip
	var obj = {};
	obj.count = obj.limit = G.apps.length;
	obj.items = G.apps;
	obj.page = 1;
	obj.pages = 1;
	callback(null, obj);
};

// Sessions
FUNC.sessions.lock = function(key, callback, expire) {
	// This method locks some operation according to the key
	// For example: sending notifications
	callback();
};

FUNC.sessions.unlock = function(key, callback) {
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

// Settings

FUNC.settings.get = function(callback) {
	Fs.readFile(F.path.databases('settings.json'), function(err, response) {
		callback(null, response ? response.toString('utf8').parseJSON(true) : {});
	});
};

FUNC.settings.set = function(data, callback) {
	Fs.writeFile(F.path.databases('settings.json'), JSON.stringify(data), NOOP);
	callback && callback(null);
};

// Common

FUNC.emit = function(type, value) {
	EMIT(type, value);
};

FUNC.on = function(type, callback) {
	ON(type, callback);
};

FUNC.error = function(place, err) {
	F.error(err, null, place);
};

FUNC.logger = LOGGER;