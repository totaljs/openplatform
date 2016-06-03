const HEADERS = {};

exports.install = function() {

	HEADERS['x-openplatfrom'] = CONFIG('url');

	// Users
	F.route('/internal/users/', json_users_query, ['authorize']);
	F.route('/internal/users/', json_schema_save, ['authorize', 'post', '*User']);
	F.route('/internal/users/', json_schema_delete, ['authorize', 'delete', '*User']);
	F.route('/internal/upload/photo/', json_upload_photo, ['authorize', 'upload'], 512);

	// Applications
	F.route('/internal/applications/', json_applications_query, ['authorize']);
	F.route('/internal/applications/', json_schema_save, ['authorize', 'post', '*Application']);
	F.route('/internal/applications/', json_schema_delete, ['authorize', 'delete', '*Application']);
	F.route('/internal/applications/download/', json_applications_download, ['authorize']);

	// Dashboard
	F.route('/internal/dashboard/applications/', json_dashboard_applications, ['authorize']);
	F.route('/internal/dashboard/notifications/', json_dashboard_notifications, ['authorize']);
	F.route('/internal/dashboard/widgets/{id}/', json_dashboard_widgets, ['authorize']);
	F.route('/internal/dashboard/widgets/{id}/add/', json_dashboard_widgets_add, ['authorize']);

	// Account
	F.route('/internal/login/', json_schema_exec, ['post', '*Login']);
	F.route('/notify/', json_notify);
};

function json_notify() {
	var item = GETSCHEMA('Notification').create();
	var index = U.random(APPLICATIONS.length - 1, 0);
	var self = this;
	item.type = 0;
	item.body = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Deserunt et veniam sequi architecto natus harum eligendi delectus reiciendis, debitis aliquid.';
	item.user = 'A349340384038';
	item.id = APPLICATIONS[index].id;
	item.$save(self, self.callback());
}

function json_dashboard_widgets(id) {
	var self = this;
	var empty = '<svg></svg>';
	var arr = id.split('X');

	var index = self.user.widgets.indexOf(id);
	if (index === -1)
		return self.content(empty);

	var app = APPLICATIONS.findItem('internal', arr[0].parseInt());
	if (!app || !app.widgets)
		return self.content(empty);

	var widget = app.widgets.findItem('internal', arr[1].parseInt());
	if (!widget)
		return self.content(empty);

	HEADERS['x-openplatfrom-user'] = self.user.id;
	U.request(widget.url, ['get'], function(err, response) {
		if (err)
			return self.content(empty);

		var svg = response.trim();
		if (!svg.startsWith('<svg'))
			return self.content(empty);

		var index = svg.indexOf('>');
		if (index === -1)
			return self.content(empty);

		self.content('<svg width="400" height="200" version="1.0" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" viewBox="0 0 400 200">' + svg.substring(index + 1));
	}, null, HEADERS);
}

function json_users_query() {
	var self = this;
	if (!self.user.superadmin)
		return self.invalid().push('error-permission');
	self.json(USERS, false, function(k, v) {
		if (k === 'password')
			return undefined;
		return v;
	});
}

function json_applications_query() {
	var self = this;
	if (!self.user.superadmin)
		return self.invalid().push('error-permission');
	self.json(APPLICATIONS);
}

function json_applications_download() {
	var self = this;

	if (!self.user.superadmin)
		return self.invalid().push('error-permission');

	U.request(self.query.id, ['get', 'dnscache', '< 5'], function(err, response) {
		if (err)
			return self.invalid().push(err);
		if (response.isJSON())
			return self.json(JSON.parse(response));
		self.invalid().push('error-invalid-openplatform');
	});
}

function json_schema_save() {
	var self = this;
	if (!self.user.superadmin)
		return self.invalid().push('error-permission');
	self.$save(self.callback());
}

function json_upload_photo() {
	var self = this;
	var file = self.files[0];
	var email = self.user.superadmin ? self.body.email || '' : self.user.email;

	if (!email.isEmail()) {
		self.invalid().push('error-email');
		return;
	}

	if (!file.isImage()) {
		self.invalid().push('error-filetype');
		return;
	}

	email = email.replace(/@|\./g, '_').toLowerCase() + '.jpg';

	file.image().make(function(filter) {
		filter.resizeAlign(100, 100, 'top', 'white');
		filter.quality(90);
		filter.output('jpg');
		filter.save(F.path.public('photos/' + email), (err) => self.callback()(err, SUCCESS(true)));
		F.touch('/photos/' + email);
	});
}

function json_schema_exec() {
	var self = this;
	self.$workflow('exec', self, self.callback());
}

function json_dashboard_applications() {
	var self = this;
	// self.user.notify({ type: 0, body: 'Lorem 10 asdôlkj saldsaj lsadj lsajdlsajjlsad', internal: APPLICATIONS[0].internal, datecreated: new Date() });
	self.json(self.user.getApplications());
}

function json_dashboard_notifications() {
	var self = this;
	self.user.getNotifications(function(err, response) {
		if (err)
			return self.invalid().push(err);
		self.content(response, 'application/json');
	});
}

function json_schema_delete() {
	var self = this;
	self.$remove(self.body.id, self.callback());
}

function json_dashboard_widgets_add(id) {
	var self = this;
	self.json(SUCCESS(self.user.addWidget(id)));
}