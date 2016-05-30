global.APPLICATIONS = [];

function Application() {

	this.name = '';
	this.picture = '';
	this.version = '';
	this.author = '';
	this.description = '';
	this.email = '';
	this.roles = '';
	this.url = '';
	this.serviceurl = '';
	this.status = '';

	this.online = false;          // Current application state according to the `openplatform` url address
	this.notifications = false;   // Can create notifications for users
	this.serviceworker = false;   // Can communicate via API
	this.users = false;
	this.applications = false;

	// Custom headers
	this.headers = {};
	this.cookies = {};

	// Meta data
	this.openplatform = 'url-to-openplatform.json';
	this.datecreated = null;
	this.dateupdated = null;
}

/**
 * Downloads info about app
 * @param {Function(err)} callback
 * @return {Application}
 */
Application.prototype.reload = function(callback) {
	var self = this;
	U.request(self.openplatform, ['get'], null, function(err, response) {

		self.dateupdated = new Date();

		if (err) {
			this.online = false;
			this.status = err.toString();
			return callback && callback(err);
		}

		var app = response.parseJSON();

		if (!app || !app.openplatform) {
			this.online = false;
			this.status = response;
			return callback && callback(err);
		}

		app = app.openplatform;

		self.name = app.name;
		self.picture = app.picture;
		self.description = app.description;
		self.roles = app.roles;
		self.url = app.url;
		self.version = app.version;
		self.author = app.author;
		self.status = 'ready';
		self.online = true;

		callback && callback(null, self);

	}, self.cookies, self.headers);
	return self;
};