exports.install = function() {
	F.route('/api/serviceworker/', json_serviceworker, ['#authorize', 'post', '*Service'], 128);
	F.route('/api/notifications/', json_notification, ['#authorize', 'post', '*Notification']);
	F.route('/api/applications/', json_applications, ['#authorize']);
	F.route('/api/users/', json_users, ['#authorize']);
	F.route('/api/profile/', json_profile, ['#authorize']);
};

F.middleware('authorize', function(req, res, next, options, controller) {

	var idapp = req.headers['x-openplatform-id'] || '';
	var iduser = req.headers['x-openplatform-user'] || '';

	if (!idapp || !iduser) {
		next = null;
		controller.status = 400;
		return controller.invalid().push('error-invalid-headers');
	}

	var app = APPLICATIONS.findItem('id', idapp);
	if (!app) {
		next = null;
		controller.status = 400;
		return controller.invalid().push('error-application-notfound');
	}

	if (app.origin && app.origin.length && app.origin.indexOf(req.ip) === -1) {
		next = null;
		controller.status = 400;
		return controller.invalid().push('error-application-origin');
	}

	if (app.secret && app.secret !== req.headers['x-openplatform-secret']) {
		next = null;
		controller.status = 400;
		return controller.invalid().push('error-application-secret');
	}

	var type = req.split[1];
	if (type !== 'profile' && !app[type]) {
		next = null;
		controller.status = 400;
		return controller.invalid().push('error-application-permissions');
	}

	var user = USERS.findItem('id', iduser);
	if (!user) {
		next = null;
		controller.status = 400;
		return controller.invalid().push('error-user-notfound');
	}

	if (!user.applications[app.internal]) {
		next = null;
		controller.status = 400;
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

function json_profile() {
	var self = this;
	self.json(self.user.readonly());
}
