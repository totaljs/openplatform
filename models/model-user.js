const Fs = require('fs');
const REG_PHOTO = /@|\./g;

global.USERS = [];

function User() {
	// Maximum length 50 characters
	this.id = '';
	this.alias = '';
	this.firstname = '';
	this.lastname = '';
	this.applications = {};               // Applications
	this.settings = {};                   // Settings of all applications
	this.language = '';
	this.phone = '';
	this.email = '';
	this.login = '';
	this.password = '';
	this.group = '';
	this.company = '';

	this.datecreated = null;
	this.datelogged = null;
	this.dateupdated = null;
	this.datepassword = null;
	this.widgets = null;                  // contains widgets (array)
	this.sounds = true;                   // enables/disables client-side sounds
	this.volume = 50;                     // volume in %

	// Internal settings
	this.online = false;                  // is the user online?
	this.blocked = false;                 // is the user blocked?
	this.superadmin = false;              // superadmin (the user will be an access to all applications and users)
	this.notifications = true;            // enables/disables notifications
	this.notificationsemail = true;       // enables/disables email notifications
	this.resetcounter = 0;                // can log off user (it's for super admin)
	this.notificationscounter = 0;        // count of notifications
	this.internal = 0;                    // internal user identificator
	this.token = '';                      // user token e.g. for auto-login
	this.session = '';                    // session identificator
	this.security = '';                   // for signature
}

User.prototype.signature = function(app) {
	var session = this.session + '~' + this.internal + '~' + app.internal;
	return session + '~' + (this.security + session).hash();
};

User.prototype.logoff = function() {
	this.online = false;
	this.secure();
	OPENPLATFORM.users.save();
	return this;
};

User.prototype.secure = function() {
	this.session = U.GUID(30);
	this.security = U.GUID(5);
	return this;
};

User.prototype.getApplications = function() {
	var arr = [];
	var self = this;
	for (var i = 0, length = APPLICATIONS.length; i < length; i++) {
		var item = APPLICATIONS[i];
		if (self.applications[item.internal]) {
			var app = item.readonly();
			app.roles = self.applications[item.internal];
			app.token = self.signature(app);
			arr.push(app);
		}
	}
	return arr;
};

User.prototype.getNotifications = function(callback) {
	var self = this;

	if (!self.notificationscounter) {
		callback(null, '[]');
		return;
	}

	var filename = F.path.databases('notifications_{0}.json'.format(self.id.hash()));

	U.queue('user.notifications', 15, function(next) {
		Fs.readFile(filename, function(err, response) {

			self.notificationscounter = 0;
			next();

			if (err)
				return callback(null, '[]');

			// Removes the file when it exists
			Fs.unlink(filename, NOOP);

			// Responds (on client-side are notifications cached)
			callback(null, '[' + response.toString('utf8').substring(1) + ']');
		});
	});

	return self;
};

User.prototype.notify = function(notification, callback) {
	var self = this;
	U.queue('user.notify', 15, function(next) {
		Fs.appendFile(F.path.databases('notifications_{0}.json'.format(self.internal)), ',' + JSON.stringify(notification), function() {
			next();
			self.notificationscounter++;
			callback && callback();
		});
	});
	return self;
};

User.prototype.readonly = function(app) {
	var self = this;
	var item = {};

	item.alias = self.alias;
	item.blocked = self.blocked;
	item.company = self.company;
	item.datecreated = self.datecreated;
	item.datelogged = self.datelogged;
	item.dateupdated = self.dateupdated;
	item.email = self.email;
	item.firstname = self.firstname;
	item.group = self.group;
	item.id = self.id;
	item.language = self.language;
	item.lastname = self.lastname;
	item.notifications = self.notifications;
	item.notificationsemail = self.notificationsemail;
	item.online = self.online;
	item.phone = self.phone;
	item.photo = OPENPLATFORM.users.photo(self.email);
	item.sounds = self.sounds;
	item.volume = self.volume;
	item.superadmin = self.superadmin;
	item.widgets = self.widgets;

	if (app) {
		item.roles = self.applications[app.internal] || EMPTYARRAY;
		item.has = self.applications[app.internal] ? true : false;
		item.settings = self.settings[app.internal] || '';
		item.config = app.config;
	}

	return item;
};

User.prototype.export = function(app) {
	var self = this;
	var item = {};

	item.alias = self.alias;
	item.blocked = self.blocked;
	item.company = self.company;
	item.datecreated = self.datecreated;
	item.datelogged = self.datelogged;
	item.dateupdated = self.dateupdated;
	item.email = self.email;
	item.firstname = self.firstname;
	item.group = self.group;
	item.id = self.id;
	item.language = self.language;
	item.lastname = self.lastname;
	item.notifications = self.notifications;
	item.online = self.online;
	item.phone = self.phone;
	item.photo = OPENPLATFORM.users.photo(self.email);
	item.sounds = self.sounds;
	item.volume = self.volume;
	item.superadmin = self.superadmin;

	if (app) {
		item.roles = self.applications[app.internal] || EMPTYARRAY;
		item.has = self.applications[app.internal] ? true : false;
		item.settings = self.settings[app.internal] || '';
		item.config = app.config;
	}

	return item;
};

// Re-Creates the token
User.prototype.tokenizer = function() {
	this.token = U.GUID(25);
	OPENPLATFORM.users.save();
	return this;
};

User.prototype.prepare = function(item) {
	var keys = Object.keys(item);
	var self = this;
	for (var i = 0, length = keys.length; i < length; i++) {
		var key = keys[i];
		self[key] = item[key];
	}
	self.search = (self.lastname + ' ' + self.firstname + ' ' + self.group).toSearch();
	self.internal = (self.id || '').hash();
	if (!(self.widgets instanceof Array))
		self.widgets = [];
	return self;
};

exports.User = User;