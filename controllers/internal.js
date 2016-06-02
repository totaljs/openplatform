exports.install = function() {
	// Users
	F.route('/internal/users/', json_users_query, ['authorize']);
	F.route('/internal/users/', json_schema_save, ['authorize', 'post', '*User']);
	F.route('/internal/upload/photo/', json_upload_photo, ['authorize', 'upload', 'authorize'], 512);

	// Applications
	F.route('/internal/applications/', json_applications_query, ['authorize']);
	F.route('/internal/applications/', json_schema_save, ['authorize', 'post', '*Application']);
	F.route('/internal/applications/download/', json_applications_download, ['authorize']);

	// Account
	F.route('/internal/login/', json_schema_exec, ['post', '*Login']);
};

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

	U.request(self.query.openplatform, ['get'], function(err, response) {
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
	var email = self.body.email || '';

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
