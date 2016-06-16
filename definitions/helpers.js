const Fs = require('fs');
const OPENPLATFORM = global.OPENPLATFORM = {};
const REG_PHOTO = /@|\./g;
const HEADERS = {};

var timeout_save_users;
var timeout_save_applications;
var counter_save_users = 0;
var counter_save_applications = 0;

HEADERS['x-openplatform'] = F.config.url;

OPENPLATFORM.Application = MODEL('model-application').Application;
OPENPLATFORM.User = MODEL('model-user').User;
OPENPLATFORM.users = {};
OPENPLATFORM.applications = {};
OPENPLATFORM.settings = {};
OPENPLATFORM.info = { version: F.config.version, name: F.config.name, url: F.config.url, author: F.config.author, email: F.config['author-email'] };

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
 * Saves users
 * @return {Boolean}
 */
OPENPLATFORM.users.save = function() {
	if (counter_save_users < 10)
		clearTimeout(timeout_save_users);
	counter_save_users++;
 	timeout_save_users = setTimeout(function() {
		Fs.writeFile(F.path.databases('users.json'), JSON.stringify(USERS), NOOP);
		counter_save_users = 0;
	}, 1000);
	return true;
};

/**
 * Loads users
 * @return {Boolean}
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

	return true;
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
	return true;
};

OPENPLATFORM.applications.create = function(url, callback) {
	var app = new OPENPLATFORM.Application();
	app.id = url;
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

OPENPLATFORM.settings.save = function(callback) {

	var settings = {};

	settings.name = F.config.name;
	settings.email = F.config.email;
	settings.url = F.config.url;
	settings.author = F.config.author;
	settings.smtp = F.config['mail.smtp'];
	settings.smtpsettings = F.config['mail.smtp.options'];

	Fs.writeFile(F.path.databases('settings.json'), JSON.stringify(settings), (err) => callback && setImmediate(() => callback(err)));
	return true;
};

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

	return true;
};

