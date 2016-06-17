const Fs = require('fs');
const OPENPLATFORM = global.OPENPLATFORM = {};
const REG_PHOTO = /@|\./g;
const VERSION = {};

var timeout_save_users;
var timeout_save_applications;
var counter_save_users = 0;
var counter_save_applications = 0;

OPENPLATFORM.Application = MODEL('model-application').Application;
OPENPLATFORM.User = MODEL('model-user').User;
OPENPLATFORM.users = {};
OPENPLATFORM.applications = {};
OPENPLATFORM.settings = {};

/**
 * Gets the basic information about the OpenPlatform
 * @return {Object}
 */
OPENPLATFORM.info = function() {
	VERSION.version = F.config.version;
	VERSION.name = F.config.name;
	VERSION.url = F.config.url;
	VERSION.author = F.config.author;
	VERSION.email = F.config.email;
	return VERSION;
};

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

/**
 * Creates link to photo
 * @param {String} email
 * @return {String}
 */
OPENPLATFORM.users.photo = function(email) {
	return F.config.url + '/photos/' + email.replace(REG_PHOTO, '_').toLowerCase() + '.jpg';
};

/**
 * Save users
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.users.save = function() {
	if (counter_save_users < 10)
		clearTimeout(timeout_save_users);
	counter_save_users++;
 	timeout_save_users = setTimeout(function() {
		Fs.writeFile(F.path.databases('users.json'), JSON.stringify(USERS), NOOP);
		counter_save_users = 0;
	}, 1000);
	return OPENPLATFORM;
};

/**
 * Loads users
 * @param {Function(err)} callback
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.users.load = function(callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, data) {

		callback && setImmediate(() => callback(err));

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

	return OPENPLATFORM;
};

/**
 * Saves applications
 * @return {Boolean}
 */
OPENPLATFORM.applications.save = function() {
	if (counter_save_applications < 10)
		clearTimeout(timeout_save_applications);
	counter_save_applications++;
 	timeout_save_applications = setTimeout(function() {
		Fs.writeFile(F.path.databases('applications.json'), JSON.stringify(APPLICATIONS), NOOP);
		counter_save_applications = 0;
	}, 1000);
	return OPENPLATFORM;
};

/**
 * Creates a new instance of the application
 * @param {String} url
 * @param {Function(err, app)} callback
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.applications.create = function(url, callback) {
	var app = new OPENPLATFORM.Application();
	app.id = url;
	app.reload(function(err) {
		callback(err, app);
	});
	return OPENPLATFORM;
};

/**
 * Loads applications
 * @param {Function(err)} callback A callback, optional.
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.applications.load = function(callback) {
	Fs.readFile(F.path.databases('applications.json'), function(err, data) {

		callback && setImmediate(() => callback(err));

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

	return OPENPLATFORM;
};

/**
 * Reloads all applications
 * @param {Function} callback
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.applications.reload = function(callback) {
	APPLICATIONS.wait((item, next) => item.reload(next), function() {
		OPENPLATFORM.applications.save();
		callback && callback();
	});
	return OPENPLATFORM;
};

/**
 * Cleans URL
 * @param {String} url
 * @return {String}
 */
OPENPLATFORM.applications.uid = function(url) {
	return url.toLowerCase().replace(/^(http|https)\:\/\//g, '').replace(/www\./g, '').trim().hash();
};

/**
 * Saves settings
 * @param {Function(err)} callback A callback, optional.
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.settings.save = function(callback) {

	var settings = {};

	settings.name = F.config.name;
	settings.email = F.config.email;
	settings.url = F.config.url;
	settings.author = F.config.author;
	settings.smtp = F.config['mail.smtp'];
	settings.smtpsettings = F.config['mail.smtp.options'];

	Fs.writeFile(F.path.databases('settings.json'), JSON.stringify(settings), (err) => callback && setImmediate(() => callback(err)));
	return OPENPLATFORM;
};

/**
 * Loads settings
 * @param {Function(err)} callback A callback, optional.
 * @return {OPENPLATFORM}
 */
OPENPLATFORM.settings.load = function(callback) {
	Fs.readFile(F.path.databases('settings.json'), function(err, data) {

		callback && setImmediate(() => callback(err));

		if (!data)
			return;

		var settings = data.toString('utf8').parseJSON();
		F.config.url = settings.url;
		F.config.author = settings.author;
		F.config.email = settings.email;
		F.config.name = settings.name;
		F.config['mail.smtp'] = settings.smtp;
		F.config['mail.smtp.options'] = settings.smtpsettings;

		// Internal framework hack: cleans mail settings cache
		delete F.temporary['mail-settings'];
	});

	return OPENPLATFORM;
};