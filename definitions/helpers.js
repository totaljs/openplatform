const Fs = require('fs');
const OpenPlatform = global.OpenPlatform = {};

OpenPlatform.Users = {};
OpenPlatform.Applications = {};

/**
 * Finds user by its ID
 * @param {String} id
 * @return {User}
 */
OpenPlatform.Users.find = function(id) {
	for (var i = 0, length = USERS.length; i < length; i++) {
		if (USERS[i].id === id)
			return USERS[i];
	}
}

/**
 * Saves users
 * @return {Boolean}
 */
OpenPlatform.Users.save = function(callback) {
	Fs.writeFile(F.path.databases('users.json'), JSON.stringify(USERS), callback);
	return true;
};

/**
 * Loads users
 * @return {Boolean}
 */
OpenPlatform.Users.load = function(callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, data) {

		callback && setImmediate(callback(err));

		if (!data)
			return;

		USERS = data.toString('utf8').parseJSON();

		for (var i = 0, length = USERS.length; i < length; i++) {
			var item = USERS[i];
			if (item.dateupdated)
				item.dateupdated = new Date(item.dateupdated);
			if (item.datecreated)
				item.datecreated = new Date(item.datecreated);
		}

	});

	return true;
};

/**
 * Saves applications
 * @return {Boolean}
 */
OpenPlatform.Applications.save = function(callback) {
	Fs.writeFile(F.path.databases('applications.json'), JSON.stringify(APPLICATIONS), callback);
	return true;
};

/**
 * Loads users
 * @return {Boolean}
 */
OpenPlatform.Applications.load = function(callback) {
	Fs.readFile(F.path.databases('users.json'), function(err, data) {

		callback && setImmediate(callback(err));

		if (!data)
			return;

		APPLICATIONS = data.toString('utf8').parseJSON();

		for (var i = 0, length = APPLICATIONS.length; i < length; i++) {
			var item = APPLICATIONS[i];
			if (item.dateupdated)
				item.dateupdated = new Date(item.dateupdated);
			if (item.datecreated)
				item.datecreated = new Date(item.datecreated);
		}

	});

	return true;
};