global.APPLICATIONS = [];

function Application() {

	this.id = 0;
	this.title = '';
	this.name = '';
	this.icon = '';
	this.version = '';
	this.author = '';
	this.description = '';
	this.email = '';
	this.roles = '';
	this.url = '';
	this.serviceurl = '';
	this.status = '';
	this.search = '';

	this.online = false;          // Current application state according to the `openplatform` url address
	this.notifications = false;   // Can create notifications for users
	this.serviceworker = false;   // Can communicate via API
	this.users = false;
	this.applications = false;

	// Custom headers
	this.events = {};
	this.origin = [];  			  // Can contains only IP address

	// Meta data
	this.openplatform = 'url-to-openplatform.json';
	this.datecreated = null;
	this.dateupdated = null;
}

Application.prototype.readonly = function() {
	var self = this;
	var item = {};
	item.id = self.openplatform;
	item.title = self.title;
	item.name = self.name;
	item.description = self.description;
	item.version = self.version;
	item.icon = self.icon;
	item.author = self.author;
	item.email = self.email;
	item.applications = self.applications;
	item.serviceworker = self.serviceworker;
	item.notifications = self.notifications;
	item.users = self.users;
	item.online = self.online;
	return item;
};

Application.prototype.prepare = function(item) {
	var keys = Object.keys(item);
	var self = this;
	for (var i = 0, length = keys.length; i < length; i++) {
		var key = keys[i];
		self[key] = item[key];
	}
	return self;
};

/**
 * Downloads info about app
 * @param {Function(err)} callback
 * @return {Application}
 */
Application.prototype.reload = function(callback) {
	var self = this;
	U.request(self.openplatform, ['get', '< 3'], function(err, response) {

		self.dateupdated = new Date();

		if (err) {
			self.online = false;
			self.status = err.toString();
			return callback && callback(err);
		}

		var app = response.parseJSON();
		if (!app) {
			self.online = false;
			this.status = response;
			return callback && callback(err);
		}

		self.id = OPENPLATFORM.applications.uid(self.openplatform);
		self.name = app.name;
		self.icon = app.icon;
		self.description = app.description;
		self.roles = app.roles;
		self.url = app.url;
		self.email = app.email;
		self.version = app.version;
		self.author = app.author;
		self.status = 'ready';
		self.online = true;
		self.events = {};
		self.origin = app.origin;

		if (!(self.origin instanceof Array))
			self.origin = null;

		if (app.subscribe) {
			for (var i = 0, length = app.subscribe.length; i < length; i++)
				self.events[app.subscribe[i].toLowerCase()] = true;
		}

		callback && callback(null, self);

	}, self.cookies, self.headers);
	return self;
};

exports.Application = Application;