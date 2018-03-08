const SKIP = { password: true, search: true, verifytoken: true };

exports.install = function() {

	GROUP(['authorize'], function() {
		// Internal
		ROUTE('/api/apps/',          ['*App --> save', 'post']);
		ROUTE('/api/apps/{id}/',     ['*App --> remove', 'delete']);
		ROUTE('/api/apps/meta/',     ['*Meta --> exec', 'post']);
		ROUTE('/api/users/',         ['*User --> save', 'post']);
		ROUTE('/api/users/{id}/',    ['*User --> remove', 'delete']);
		ROUTE('/api/users/rename/',  ['*UserRename --> exec', 'post']);
		ROUTE('/api/users/notify/',  ['*UserNotify --> exec', 'post']);
		ROUTE('/api/users/apps/',    ['*UserApps --> exec', 'post']);
		ROUTE('/api/profile/',       ['*Profile --> save', 'post']);

		ROUTE('/api/apps/{id}/',     json_apps_meta);
		ROUTE('/api/apps/',          json_apps_query);
		ROUTE('/api/users/',         json_users_query);
		ROUTE('/api/meta/',          json_meta_query);

		ROUTE('/api/account/',       ['*Account --> read']);
		ROUTE('/api/account/',       ['*Account --> save', 'post']);

		ROUTE('/api/settings/',      ['*Settings --> read']);
		ROUTE('/api/settings/',      ['*Settings --> save', 'post']);
		ROUTE('/api/settings/smtp/', ['*SettingsSMTP --> exec', 'post', 10000]);

		ROUTE('/api/upload/photo/',  json_upload_photo, ['post'], 1024 * 2);
	});

	// External
	ROUTE('/api/verify/',        json_verify, ['cors']);
	ROUTE('/api/notify/',        ['*Notification --> save', 'post', 'cors']);
	ROUTE('/api/login/',         ['*Login --> exec', 'post', 'unauthorize']);
	ROUTE('/api/password/',      ['*Password --> exec', 'post', 'unauthorize']);
};

function json_verify() {
	var self = this;
	var arr = self.query.accesstoken.split('-');

	// 0 - app accesstoken
	// 1 - app id
	// 2 - user accesstoken
	// 3 - user id
	// 4 - verification token

	var app = F.global.apps.findItem('accesstoken', arr[0]);

	if (!app || app.id !== arr[1]) {
		self.invalid().push('error-invalid-accesstoken');
		return;
	}

	if (app.origin) {
		if (!app.origin[self.ip] && app.hostname !== self.ip) {
			self.invalid().push('error-invalid-origin');
			return;
		}
	} else if (app.hostname !== self.ip) {
		self.invalid().push('error-invalid-origin');
		return;
	}

	var user = F.global.users.findItem('accesstoken', arr[2]);
	if (!user || user.id !== arr[3] || user.verifytoken !== arr[4]) {
		self.invalid().push('error-invalid-accesstoken');
		return;
	}

	if (user.inactive || user.blocked) {
		self.invalid().push('error-accessible');
		return;
	}

	self.json(OP.meta(app, user, true));
}

function json_apps_query() {
	var self = this;
	if (self.user.sa)
		self.json(F.global.apps);
	else
		self.invalid().push('error-permissions');
}

function json_users_query() {
	var self = this;
	if (self.user.sa)
		self.json(F.global.users, false, (k, v) => SKIP[k] ? undefined : v);
	else
		self.invalid().push('error-permissions');
}

function json_meta_query() {
	this.json(F.global.meta, false);
}

function json_apps_meta(id) {
	var item = F.global.apps.findItem('id', id);
	if (item)
		this.json(OP.meta(item, this.user));
	else
		this.invalid().push('error-app-404');
}

function json_upload_photo() {
	var self = this;
	var id = F.datetime.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.jpg';
	self.body.file.base64ToFile(F.path.public('photos/' + id), () => self.json(id));
}