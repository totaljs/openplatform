exports.install = function() {
	F.route('/api/users/', json_users_query);
	F.route('/api/serviceworker/');
	F.route('/api/notification/');
	F.route('/api/widget/');
	F.route('/api/upload/photo/',       json_upload_photo,      ['upload', 'authorize'], 512);
};

function json_users_query() {
	var self = this;
	self.json(USERS);
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