const Fs = require('fs');
const OPENPLATFORM = global.OPENPLATFORM = {};
const REG_PHOTO = /@|\./g;
const HEADERS = {};

HEADERS['x-openplatform'] = CONFIG('version');
HEADERS['x-openplatform-url'] = CONFIG('url');

OPENPLATFORM.Application = MODEL('model-application').Application;
OPENPLATFORM.User = MODEL('model-user').User;
OPENPLATFORM.users = {};
OPENPLATFORM.applications = {};
OPENPLATFORM.settings = {};

/**
 * Finds user by its ID
 * @param {String} id
 * @return {User}
 */
OPENPLATFORM.users.find = function(id) {
	for (var i = 0, length = USERS.length; i < length; i++) {
		if (USERS[i].id === id)
			return USERS[i];
	}
};

OPENPLATFORM.users.photo = function(email) {
	return CONFIG('url') + '/photos/' + email.replace(REG_PHOTO, '_').toLowerCase() + '.jpg';
};

/**
 * Saves users
 * @return {Boolean}
 */
OPENPLATFORM.users.save = function(callback) {
	Fs.writeFile(F.path.databases('users.json'), JSON.stringify(USERS), callback);
	return true;
};

OPENPLATFORM.users.create_notification = function(user, obj){

};

/**
 * Loads users
 * @return {Boolean}
 */
OPENPLATFORM.users.load = function(callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, data) {

		callback && setImmediate(callback(err));

		if (!data)
			return;

		var arr = data.toString('utf8').parseJSON();

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.dateupdated)
				item.dateupdated = new Date(item.dateupdated);
			if (item.datecreated)
				item.datecreated = new Date(item.datecreated);
			if (item.datelast)
				item.datelast = new Date(item.datelast);
			if (item.datelogged)
				item.datelogged = new Date(item.datelogged);
			USERS.push(new OPENPLATFORM.User().prepare(item));
		}

	});

	return true;
};

/**
 * Saves applications
 * @return {Boolean}
 */
OPENPLATFORM.applications.save = function(callback) {
	Fs.writeFile(F.path.databases('applications.json'), JSON.stringify(APPLICATIONS), callback);
	return true;
};

OPENPLATFORM.applications.create = function(url, callback) {
	var app = new OPENPLATFORM.Application();
	app.openplatform = url;
	app.reload(function(err) {
		callback(err, app);
	});
};

/**
 * Loads users
 * @return {Boolean}
 */
OPENPLATFORM.applications.load = function(callback) {
	Fs.readFile(F.path.databases('applications.json'), function(err, data) {

		callback && setImmediate(callback(err));

		if (!data)
			return;

		APPLICATIONS = [];

		var arr = data.toString('utf8').parseJSON();
		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.dateupdated)
				item.dateupdated = new Date(item.dateupdated);
			if (item.datecreated)
				item.datecreated = new Date(item.datecreated);
			APPLICATIONS.push(new OPENPLATFORM.Application().prepare(item));
		}

		// Reloads applications
		OPENPLATFORM.applications.reload();
	});

	return true;
};

OPENPLATFORM.applications.reload = function(callback) {
	APPLICATIONS.wait((item, next) => item.reload(next), function() {
		OPENPLATFORM.applications.save();
		callback && callback();
	});
};

OPENPLATFORM.applications.uid = function(url) {
	return url.toLowerCase().replace(/^(http|https)\:\/\//g, '').replace(/www\./g, '').trim().hash();
};