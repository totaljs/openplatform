exports.install = function() {
	F.route('/api/serviceworker/', json_serviceworker, ['#authorize', 'post', '*Service'], 128);
	F.route('/api/notifications/', json_notification, ['#authorize', 'post', '*Notification']);
	F.route('/api/applications/', json_applications, ['#authorize']);
	F.route('/api/users/', json_users, ['#authorize']);
};

F.middleware('authorize', function(req, res, next, options, controller) {

	var app = APPLICATIONS.findItem('id', req.headers['x-openplatform-id'] || '');
	if (!app) {
		next = null;
		return controller.invalid().push('error-application-notfound');
	}

	if (app.origin && app.origin.length && app.origin.indexOf(req.ip) === -1) {
		next = null;
		return controller.invalid().push('error-application-origin');
	}

	if (app.secret && app.secret !== req.headers['x-openplatform-secret']) {
		next = null;
		return controller.invalid().push('error-application-secret');
	}

	var type = req.split[1];
	if (type === 'notification')
		type = 'notifications';

	if (!app[type]) {
		next = null;
		return controller.invalid().push('error-application-permissions');
	}

	var user = USERS.findItem('id', req.headers['x-openplatform-user'] || '');
	if (!user) {
		next = null;
		return controller.invalid().push('error-user-notfound');
	}

	if (!user.applications[app.internal]) {
		next = null;
		return self.invalid().push('error-user-application');
	}

	req.user = user;
	controller.app = app;
	next();
});

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

function json_notification() {
	var self = this;
	self.$save(self, self.callback());
}

function json_serviceworker() {
	var self = this;
	self.$save(self, self.callback());
}
