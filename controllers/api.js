const Path = require('path');

exports.install = function() {

	// Profile
	ROUTE('+POST    /api/upload/photo/', json_upload_photo, 1024 * 2);
	ROUTE('+POST    /api/upload/background/', json_upload_background, ['upload'], 1024 * 5);
	ROUTE('+POST    /api/upload/logo/', json_upload_logo, 1024 * 5);

	// External
	ROUTE('GET     /api/users/                    *Users                --> public');
	ROUTE('GET     /api/apps/                     *Apps                 --> public');
	ROUTE('GET     /api/badges/                   *Apps/Badges          --> exec');
	ROUTE('GET     /api/badge/                    *Apps/Badges          --> exec');
	ROUTE('POST    /api/notify/                   *Apps/Notifications   --> save');
	ROUTE('POST    /api/mail/                     *Apps/Mail            --> exec');
	ROUTE('POST    /api/sms/                      *Apps/SMS             --> exec');
	ROUTE('GET     /api/meta/                     *Meta                 --> read');
	ROUTE('GET     /api/verify/', json_verify);
	ROUTE('POST    /api/services/', json_service, ['raw'], 1024);
	ROUTE('GET     /verify/', json_verify);
	ROUTE('GET     /guest/', redirect_guest);
	ROUTE('+GET    /internal/screenshots/{id}/    *Users/Reports        --> screenshot');

	// CORS
	CORS();

	ROUTE('FILE /photos/*.*', handle_images);
	ROUTE('FILE /backgrounds/*.*', handle_images);
	ROUTE('FILE /logos/*.png', handle_images);
};

const IMAGES = { jpg: 1, jpeg: 1, png: 1, webp: 1, gif: 1, apng: 1, svg: 1 };

function handle_images(req, res) {
	if (IMAGES[req.extension]) {
		var path = FUNC.uploaddir(req.split[0]);
		res.file(Path.join(path, req.split[1]));
	} else
		res.throw404();
}

function json_verify() {
	var self = this;

	if (CONF.guest && MAIN.guest && self.query.accesstoken.endsWith('0-0-0')) {
		self.json(MAIN.metaguest());
		return;
	}

	FUNC.decodeauthtoken(self, function(obj) {

		var app = obj.app;
		var user = obj.user;

		app.origintoken && self.header('X-Origin', app.origintoken);

		if (user.online)
			self.json(FUNC.meta(app, user, true));
		else
			self.invalid('error-offline');
	});
}

function json_upload_photo() {

	var self = this;
	var base64 = self.body.file;

	if (!base64) {
		$.invalid('error-file-type');
		return;
	}

	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.jpg';
	var path = FUNC.uploaddir('photos');
	PATH.mkdir(path);
	base64.base64ToFile(U.join(path, id), () => self.json(id));
}

function json_upload_background() {
	var self = this;
	var file = self.files[0];

	if (!file) {
		self.invalid('error-file-type');
		return;
	}

	var path = FUNC.uploaddir('backgrounds');
	PATH.mkdir(path);
	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.' + U.getExtension(file.filename);
	file.move(U.join(path, id), () => self.json(id));
}

function json_upload_logo() {

	var self = this;
	var base64 = self.body.file;

	if (!base64) {
		$.invalid('error-file-type');
		return;
	}

	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.png';
	var path = FUNC.uploaddir('logos');
	PATH.mkdir(path);
	base64.base64ToFile(U.join(path, id), () => self.json(id));
}

function redirect_guest() {
	var self = this;
	CONF.guest && self.cookie(CONF.auth_cookie, 'guest', '1 day');
	self.redirect('/');
}

function json_service() {

	var self = this;

	var serviceid = self.query.service;
	if (!serviceid) {
		self.invalid('error-services-invalid');
		return;
	}

	var appid = self.query.app; // can be {String} or {UID}
	if (!appid) {
		self.invalid('error-services-app');
		return;
	}

	FUNC.decodetoken(self, function(obj) {

		if (appid === 'openplatform') {

			self.user = obj.user;
			if (serviceid === 'mail')
				$WORKFLOW('Mail', 'send', self.body, self.callback());
			else {
				self.body = self.body.toString('utf8').parseJSON(true);
				OPERATION('api_' + serviceid, obj.app, self.callback(), self);
			}
			return;
		}

		var app = null;
		var is = false;

		for (var i = 0; i < MAIN.apps.length; i++) {
			app = MAIN.apps[i];
			if (app.id === appid || app.reference === appid || app.name === appid) {
				is = true;
				break;
			}
		}

		if (!is) {
			self.invalid('error-apps-404');
			return;
		}

		if (!app.online) {
			self.invalid('error-apps-offline');
			return;
		}

		if (!app.services) {
			self.invalid('error-services-notsupported');
			return;
		}

		var endpoint = app.services[serviceid];
		if (!endpoint) {
			self.invalid('error-services-endpoint').replace('@', serviceid);
			return;
		}

		var headers = {};
		headers['X-OpenPlatform'] = MAIN.id + '-' + obj.user.directoryid + '-' + CONF.verifytoken + '-' + obj.user.id + '-' + app.servicetoken;
		headers['Content-Type'] = self.headers['content-type'];

		if (app.origintoken)
			headers['X-Origin'] = app.origintoken;

		var opt = {};
		opt.keepalive = true;
		opt.url = endpoint;
		opt.headers = headers;
		opt.method = 'POST';
		opt.encoding = 'binary';
		opt.body = self.buffer;
		opt.callback = function(err, response) {
			if (err) {
				self.status = response.status < 400 ? 500 : response.status;
				self.invalid(err);
			} else {
				self.status = response.status;
				self.binary(response.body, response.headers['content-type']);
			}
		};
		REQUEST(opt);
	});
}