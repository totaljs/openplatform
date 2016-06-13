global.APPLICATIONS = [];

function Application() {

	this.id = 'url-to-openplatform.json';
	this.internal = 0;
	this.title = '';
	this.name = '';
	this.icon = '';
	this.version = '';
	this.author = '';
	this.description = '';
	this.email = '';
	this.url = '';
	this.serviceurl = '';
	this.status = '';
	this.search = '';
	this.responsive = false;
	this.secret = '';

	this.online = false;          // Current application state according to the `openplatform` url address
	this.notifications = false;   // Can create notifications for users
	this.serviceworker = false;   // Can communicate via API
	this.users = false;
	this.applications = false;
	this.mobile = false;

	this.events = null;           // events
	this.origin = null; 		  // Can contains only IP address
	this.widgets = null;          // Widgets (Object array)
	this.roles = null;

	// Meta data
	this.datecreated = null;
	this.dateupdated = null;
}

Application.prototype.readonly = function() {
	var self = this;
	var item = {};
	item.id = self.id;
	item.title = self.title;
	item.name = self.name;
	item.linker = self.linker;
	item.description = self.description;
	item.version = self.version;
	item.icon = self.icon;
	item.author = self.author;
	item.email = self.email;
	item.applications = self.applications;
	item.serviceworker = self.serviceworker;
	item.notifications = self.notifications;
	item.responsive = self.responsive;
	item.mobile = self.mobile;
	item.users = self.users;
	item.online = self.online;
	item.url = self.url;
	item.internal = self.internal;
	item.events = self.events;
	item.session = self.session;
	item.widgets = self.widgets;
	item.roles = self.roles;
	return item;
};

Application.prototype.export = function() {
	var self = this;
	var item = {};
	item.id = self.id;
	item.title = self.title;
	item.name = self.name;
	item.linker = self.linker;
	item.description = self.description;
	item.version = self.version;
	item.icon = self.icon;
	item.author = self.author;
	item.email = self.email;
	item.applications = self.applications;
	item.serviceworker = self.serviceworker;
	item.notifications = self.notifications;
	item.responsive = self.responsive;
	item.mobile = self.mobile;
	item.users = self.users;
	item.online = self.online;
	item.url = self.url;
	item.session = self.session;
	item.roles = self.roles;
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
	U.request(self.id, ['get', '< 5', 'dnscache'], function(err, response) {

		self.dateupdated = F.datetime;

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

		self.internal = OPENPLATFORM.applications.uid(self.id);
		self.name = app.name;
		self.icon = app.icon;
		self.description = app.description;
		self.roles = app.roles;
		self.url = app.url;
		self.email = app.email;
		self.version = app.version;
		self.author = app.author;
		self.responsive = app.responsive || false;
		self.status = 'ready';
		self.session = app.session;
		self.online = true;
		self.events = {};
		self.origin = app.origin;
		self.search = (self.name + ' ' + self.title).toSearch();
		self.serviceurl = app.serviceworker;

		var widgets = app.widgets;
		if (widgets instanceof Array) {
			self.widgets = [];
			for (var i = 0, length = widgets.length; i < length; i++) {
				var w = widgets[i];
				if (!w)
					continue;
				var interval = w.internal || 15000;
				if (interval < 10000)
					interval = 10000;
				var size = w.size || 1;
				if (size > 3)
					size = 3;
				else if (size < 0)
					size = 1;
				self.widgets.push({ internal: w.url.hash(), name: w.name, url: w.url, interval: interval, roles: w.roles, redirect: w.redirect, size: size });
			}
			if (!self.widgets.length)
				self.widgets = null;
		} else
			self.widgets = null;

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