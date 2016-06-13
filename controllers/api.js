exports.install = function() {
	F.route('/api/serviceworker/', json_serviceworker, ['#authorize', 'post', '*Service'], 128);
	F.route('/api/notifications/', json_notifications, ['#authorize', 'post', '*Notification']);
	F.route('/api/applications/',  json_applications,  ['#authorize']);
	F.route('/api/users/',         json_users,         ['#authorize']);
	F.route('/session/',           json_session);
};

// Middleware for API
F.middleware('authorize', function(req, res, next, options, controller) {

	var idapp = req.headers['x-openplatform-id'] || '';
	var iduser = req.headers['x-openplatform-user'] || '';

	if (!idapp || !iduser) {
		next = null;
		controller.invalid(400).push('error-invalid-headers');
		return false;
	}

	var app = APPLICATIONS.findItem('id', idapp);

	if (!app) {
		next = null;
		controller.invalid(400).push('error-application-notfound');
		return false;
	}

	if (app.origin && app.origin.length && app.origin.indexOf(req.ip) === -1) {
		next = null;
		controller.invalid(400).push('error-application-origin');
		return false;
	}

	if (app.secret && app.secret !== req.headers['x-openplatform-secret']) {
		next = null;
		controller.invalid(400).push('error-application-secret');
		return false;
	}

	var type = req.split[1];
	if (type !== 'openplatform' && !app[type]) {
		next = null;
		controller.invalid(400).push('error-application-permissions');
		return false;
	}

	var user = USERS.findItem('id', iduser);
	if (!user) {
		next = null;
		controller.invalid().push('error-user-notfound');
		return false;
	}

	if (!user.applications[app.internal]) {
		next = null;
		self.invalid(400).push('error-user-application');
		return false;
	}

	req.user = user;
	controller.app = app;
	next();
});

function json_serviceworker() {
	var self = this;
	self.$save(self, self.callback());
}

function json_notifications() {
	var self = this;
	self.$save(self, self.callback());
}

function json_applications() {
	var self = this;
	var arr = [];

	for (var i = 0, length = APPLICATIONS.length; i < length; i++) {
		var item = APPLICATIONS[i];
		if (!self.user.applications[item.internal])
			continue;
		arr.push(item.export());
	}

	self.json(arr);
}

function json_users() {
	var self = this;
	var arr = [];

	for (var i = 0, length = USERS.length; i < length; i++) {
		var item = USERS[i];
		arr.push(item.export());
	}

	self.json(arr);
}

function json_profile() {
	var self = this;
	var user = self.user.export();
	user.roles = self.user.applications[self.app.internal];
	self.json(user);
}

function json_session() {

	var self = this;
	var idapp = self.req.headers['x-openplatform-id'] || '';
	if (!idapp)
		return self.invalid(400).push('error-invalid-headers');

	var token = self.query.token || '';
	var arr = token.split('~');
	if (arr.length !== 4)
		return self.invalid(400).push('error-invalid-token');

	var user = USERS.findItem('internal', arr[1].parseInt());
	if (!user || !user.online || user.session !== arr[0])
		return self.invalid(400).push('error-invalid-token');

	var app = APPLICATIONS.findItem('internal', arr[2].parseInt());
	if (!app || !user.applications[app.internal] || user.signature(app) !== token)
		return self.invalid(400).push('error-invalid-token');

	if (app.origin && app.origin.length && app.origin.indexOf(self.req.ip) === -1)
		return self.invalid(400).push('error-application-origin');

	if (app.secret && app.secret !== self.req.headers['x-openplatform-secret'])
		return self.invalid(400).push('error-application-secret');

	var output = user.export();
	output.roles = user.applications[app.internal];
	output.openplatform = OPENPLATFORM.info;
	self.json(output);
}

