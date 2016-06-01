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

	this.datecreated = null;
	this.datelogged = null;
	this.dateupdated = null;

	// Internal settings
	this.online = false;
	this.sounds = true;
	this.blocked = false;
	this.superadmin = false;
	this.notifications = true;
}

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
	item.notifications = self.notifications;
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