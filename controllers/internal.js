const HEADERS = {};

exports.install = function() {

	// Users
	F.route('/internal/users/',                    json_users_query,               ['authorize']);
	F.route('/internal/users/',                    json_schema_save,               ['authorize', 'post', '*User']);
	F.route('/internal/users/',                    json_schema_delete,             ['authorize', 'delete', '*User']);
	F.route('/internal/users/group/',              json_schema_save,               ['authorize', 'post', '*UserGroup']);
	F.route('/internal/users/company/',            json_schema_save,               ['authorize', 'post', '*UserCompany']);
	F.route('/internal/users/permissions/',        json_schema_save,               ['authorize', 'post', '*UserPermissions']);
	F.route('/internal/users/notify/',             json_schema_save,               ['authorize', 'post', '*Notify']);
	F.route('/internal/users/newsletter/',         json_schema_save,               ['authorize', 'post', '*UserNewsletter']);
	F.route('/internal/upload/photo/',             json_upload_photo,              ['authorize', 'upload'], 512);

	// Applications
	F.route('/internal/applications/',             json_applications_query,        ['authorize']);
	F.route('/internal/applications/',             json_schema_save,               ['authorize', 'post', '*Application']);
	F.route('/internal/applications/',             json_schema_delete,             ['authorize', 'delete', '*Application']);
	F.route('/internal/applications/download/',    json_applications_download,     ['authorize']);
	F.route('/internal/applications/refresh/',     json_applications_refresh,      ['authorize']);

	// Settings
	F.route('/internal/settings/',                 json_settings_read,             ['authorize', '*Settings']);
	F.route('/internal/settings/',                 json_settings_save,             ['authorize', 'post', '*Settings']);

	// Dashboard
	F.route('/internal/dashboard/applications/',   json_dashboard_applications,    ['authorize']);
	F.route('/internal/dashboard/notifications/',  json_dashboard_notifications,   ['authorize']);
	F.route('/internal/dashboard/users/',          json_dashboard_users,           ['authorize']);
	F.route('/internal/dashboard/widgets/',        json_dashboard_widgets_save,    ['authorize', 'post', '*Widget']);
	F.route('/internal/dashboard/widgets/{id}/',   json_dashboard_widgets_content, ['authorize']);

	// Account
	F.route('/internal/login/',                    json_schema_exec,               ['unauthorize', 'post', '*Login']);
	F.route('/internal/password/',                 json_schema_exec,               ['unauthorize', 'post', '*Password']);
	F.route('/internal/account/',                  json_account_save,              ['authorize', 'post', '*Account']);
};

function json_schema_save() {
	var self = this;
	if (!self.user.superadmin)
		return self.invalid().push('error-permission');
	self.$save(self, self.callback());
}

function json_schema_exec() {
	var self = this;
	self.$workflow('exec', self, self.callback());
}

function json_schema_delete() {
	var self = this;
	self.$remove(self.body.id, self.callback());
}
function json_dashboard_applications() {
	var self = this;
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

function json_dashboard_widgets_content(id) {
	var self = this;
	var arr = id.split('X');

	var index = self.user.widgets.indexOf(id);
	if (index === -1)
		return self.empty();

	var app = APPLICATIONS.findItem('internal', arr[0].parseInt());
	if (!app || !app.widgets)
		return self.empty();

	var widget = app.widgets.findItem('internal', arr[1].parseInt());
	if (!widget)
		return self.empty();

	HEADERS['x-openplatform-user'] = self.user.id;
	HEADERS['x-openplatform'] = F.config.url;

	if (app.secret)
		HEADERS['x-openplatform-secret'] = app.secret;
	else if (HEADERS['x-openplatform-secret'])
		delete HEADERS['x-openplatform-secret'];

	U.request(widget.url, ['get', 'dnscache', '< 30', 1500], function(err, response, code, headers) {
		if (err || code !== 200)
			return self.empty();
		self.content(response, 'text/plain');
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
			return self.json(response.parseJSON());
		self.invalid().push('error-invalid-openplatform');
	});
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

		// Refreshes internal cache
		F.touch('/photos/' + email);
	});
}

function json_dashboard_widgets_save() {
	var self = this;
	self.$save(self, self.callback());
}

function json_account_save() {
	var self = this;
	self.$save(self, self.callback());
}

function json_dashboard_users() {
	var self = this;
	var arr = [];

	for (var i = 0, length = USERS.length; i < length; i++) {
		var item = USERS[i];
		var user = item.export();
		user.applications = item.applications;
		arr.push(user);
	}

	self.json(arr);
}

function json_applications_refresh() {
	var self = this;
	var app = APPLICATIONS.findItem('id', self.query.id);
	if (!app)
		return self.json(SUCCESS(false));
	app.reload((err) => self.json(SUCCESS(!err)));
}

function json_settings_read() {
	var self = this;
	self.$read(self.callback());
}

function json_settings_save() {
	var self = this;
	self.$async(self.callback(), 1).$workflow('smtp', self).$save(self);
}