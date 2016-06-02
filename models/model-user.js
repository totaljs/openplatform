const REG_PHOTO = /@|\./g;
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

	// Internal settings
	this.online = false;
	this.sounds = true;
	this.blocked = false;
	this.superadmin = false;
	this.notifications = true;
	this.resetcounter = 0;
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
		if (self.applications[item.id])
			arr.push(item.readonly());
	}
	return arr;
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
	return item;
};

User.prototype.prepare = function(item) {
	var keys = Object.keys(item);
	var self = this;
	for (var i = 0, length = keys.length; i < length; i++) {
		var key = keys[i];
		self[key] = item[key];
	}
	return self;
};

exports.User = User;