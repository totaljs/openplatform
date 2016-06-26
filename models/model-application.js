const REQUEST_HEADERS = {};
const REQUEST_FLAGS = ['post', 'json', '< 1'];
const REQUEST_FLAGS_RELOAD = ['get', '< 5', 'dnscache'];

global.APPLICATIONS = [];

function Application() {

	// openplatform.json:
	this.id = 'url-to-openplatform.json';
	this.name = '';
	this.icon = '';
	this.version = '';
	this.author = '';
	this.description = '';
	this.email = '';
	this.url = '';                // Application URL
	this.url_session = '';        // URL to create a session
	this.url_register = '';
	this.url_unregister = '';
	this.url_subscribe = '';
	this.responsive = false;
	this.service = false;

	// internal properties:
	this.status = '';
	this.search = '';
	this.internal = 0;
	this.title = '';
	this.secret = '';
	this.config = '';             // Custom configuration

	this.online = false;          // Current application state according to the `openplatform` url address
	this.notifications = false;   // Can create notifications for users
	this.serviceworker = false;   // Can communicate via API
	this.users = false;           // Can read all users?
	this.applications = false;    // Would be read all applications?
	this.mobile = false;          // Is to be visible for mobile devices?

	this.events = null;           // Registered events for service worker
	this.origin = null; 		  // Can contains only IP address
	this.widgets = null;          // Widgets (Object Array)
	this.roles = null;            // Roles (Stirng Array)

	// Meta data
	this.datecreated = null;
	this.dateupdated = null;
}

/**
 * Generates a public data
 * @return {[type]} [description]
 */
Application.prototype.readonly = function() {
	var self = this;
	var item = {};
	item.applications = self.applications;
	item.author = self.author;
	item.config = self.config;
	item.description = self.description;
	item.email = self.email;
	item.icon = self.icon;
	item.id = self.id;
	item.internal = self.internal;
	item.linker = self.linker;
	item.mobile = self.mobile;
	item.name = self.name;
	item.notifications = self.notifications;
	item.online = self.online;
	item.publish = self.publish;
	item.responsive = self.responsive;
	item.roles = self.roles;
	item.service = self.service;
	item.serviceworker = self.serviceworker;
	item.subscribe = self.subscribe;
	item.title = self.title;
	item.url = self.url;
	item.url_session = self.url_session;
	item.url_subscribe = self.url_subscribe;
	item.users = self.users;
	item.version = self.version;
	item.widgets = self.widgets;
	return item;
};

/**
 * Generates a public data for other applications
 * @return {Object}
 */
Application.prototype.export = function() {
	var self = this;
	var item = {};
	item.applications = self.applications;
	item.author = self.author;
	item.description = self.description;
	item.email = self.email;
	item.icon = self.icon;
	item.id = self.id;
	item.linker = self.linker;
	item.mobile = self.mobile;
	item.name = self.name;
	item.notifications = self.notifications;
	item.online = self.online;
	item.publish = self.publish;
	item.responsive = self.responsive;
	item.roles = self.roles;
	item.service = self.service;
	item.serviceworker = self.serviceworker;
	item.subscribe = self.subscribe;
	item.title = self.title;
	item.url = self.url;
	item.url_session = self.url_session;
	item.url_subscribe = self.url_subscribe;
	item.users = self.users;
	item.version = self.version;
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

Application.prototype.register = function(user, callback) {
	var self = this;

	if (!self.url_register) {
		callback && callback();
		return false;
	}

	REQUEST_HEADERS['x-openplatform'] = F.config.url;
	REQUEST_HEADERS['x-openplatform-user'] = user.id;
	REQUEST_HEADERS['x-openplatform-id'] = self.id;

	if (self.secret)
		REQUEST_HEADERS['x-openplatform-secret'] = self.secret;
	else if (REQUEST_HEADERS['x-openplatform-secret'])
		delete REQUEST_HEADERS['x-openplatform-secret'];

	U.request(self.url_register, REQUEST_FLAGS, user.export(self), callback, null, REQUEST_HEADERS);
	return true;
};

Application.prototype.unregister = function(user, callback) {
	var self = this;

	if (!self.url_unregister) {
		callback && callback();
		return false;
	}

	REQUEST_HEADERS['x-openplatform'] = F.config.url;
	REQUEST_HEADERS['x-openplatform-user'] = user.id;
	REQUEST_HEADERS['x-openplatform-id'] = self.id;

	if (self.secret)
		REQUEST_HEADERS['x-openplatform-secret'] = self.secret;
	else if (REQUEST_HEADERS['x-openplatform-secret'])
		delete REQUEST_HEADERS['x-openplatform-secret'];

	U.request(self.url_unregister, REQUEST_FLAGS, user.export(self), callback, null, REQUEST_HEADERS);
	return true;
};

/**
 * Downloads info about app
 * @param {Function(err)} callback
 * @return {Application}
 */
Application.prototype.reload = function(callback) {
	var self = this;
	U.request(self.id, REQUEST_FLAGS_RELOAD, function(err, response, status, headers, ip) {

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
		self.online = true;
		self.events = {};
		self.origin = app.origin;
		self.service = app.service === true;
		self.search = (self.name + ' ' + self.title).toSearch();
		self.url_subscribe = app.url_subscribe;
		self.url_register = app.url_register;
		self.url_unregister = app.url_unregister;
		self.url_session = app.url_session;

		var widgets = app.widgets;
		if (widgets instanceof Array) {
			self.widgets = [];
			for (var i = 0, length = widgets.length; i < length; i++) {
				var w = widgets[i];
				if (!w || !w.url)
					continue;
				var interval = w.internal || 15000;
				if (interval < 10000)
					interval = 10000;
				var size = w.size || 1;
				if (size > 3)
					size = 3;
				else if (size < 0)
					size = 1;
				self.widgets.push({ internal: w.url.hash(), name: w.name, url: w.url, interval: interval, roles: w.roles, redirect: w.redirect, size: size, background: w.background || 'white', color: w.color || '#A0A0A0' });
			}
			if (!self.widgets.length)
				self.widgets = null;
		} else
			self.widgets = null;

		if (!(self.origin instanceof Array))
			self.origin = [ip];
		/*
		else if (self.origin.indexOf(ip) === -1)
			self.origin.push(ip);
		*/

		if (app.publish && app.publish instanceof Array && app.publish.length)
			self.publish = app.publish;
		else
			self.publish = null;

		if (app.subscribe && app.subscribe instanceof Array && app.subscribe.length)
			self.subscribe = app.subscribe;
		else
			self.subscribe = null;

		callback && callback(null, self);
	}, self.cookies, self.headers);
	return self;
};

exports.Application = Application;