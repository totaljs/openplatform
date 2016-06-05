const Fs = require('fs');
const REG_PHOTO = /@|\./g;
const EMPTYARRAY = [];

global.USERS = [];

function User() {
	// Maximum length 50 characters
	this.id = '';
	this.alias = '';
	this.firstname = '';
	this.lastname = '';
	this.applications = {};
	this.phone = '';
	this.email = '';
	this.login = '';
	this.password = '';
	this.group = '';

	this.datecreated = null;
	this.datelogged = null;
	this.dateupdated = null;
	this.datepassword = null;
	this.widgets = null;

	// Internal settings
	this.online = false;
	this.sounds = true;
	this.blocked = false;
	this.superadmin = false;
	this.notifications = true;
	this.resetcounter = 0;
	this.notificationscounter = 0;
	this.internal = 0;
}

User.prototype.logoff = function() {
	this.online = false;
	return this;
};

User.prototype.getApplications = function() {
	var arr = [];
	var self = this;
	for (var i = 0, length = APPLICATIONS.length; i < length; i++) {
		var item = APPLICATIONS[i];
		if (self.applications[item.internal])
			arr.push(item.readonly());
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
			console.log(arguments);
			next();
			self.notificationscounter++;
			callback && callback();
		});
	});
	return self;
};

User.prototype.readonly = function() {
	var self = this;
	var item = {};
	item.id = self.id;
	item.firstname = self.firstname;
	item.lastname = self.lastname;
	item.photo = OPENPLATFORM.users.photo(self.email);
	item.email = self.email;
	item.phone = self.phone;
	item.alias = self.alias;
	item.online = self.online;
	item.blocked = self.blocked;
	item.group = self.group;
	item.notifications = self.notifications;
	item.dateupdated = self.dateupdated;
	item.sounds = self.sounds;
	item.widgets = self.widgets;
	return item;
};

User.prototype.export = function() {
	var self = this;
	var item = {};
	item.id = self.id;
	item.firstname = self.firstname;
	item.lastname = self.lastname;
	item.photo = OPENPLATFORM.users.photo(self.email);
	item.email = self.email;
	item.phone = self.phone;
	item.alias = self.alias;
	item.online = self.online;
	item.blocked = self.blocked;
	item.group = self.group;
	item.notifications = self.notifications;
	item.dateupdated = self.dateupdated;
	item.sounds = self.sounds;
	return item;
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
	return self;
};

exports.User = User;