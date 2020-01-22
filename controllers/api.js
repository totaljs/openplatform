const ONLINE = { online: true, dtlogged: null };
const USERS_PROFILE_SKIP = { roles: 1 };
const REQUEST_FLAGS = ['post', 'keepalive', 'json'];

exports.install = function() {

	// Users
	ROUTE('+GET     /api/op/users/                 *Users              --> @query');
	ROUTE('+GET     /api/op/users/{id}/            *Users              --> @read');
	ROUTE('+POST    /api/op/users/                 *Users              --> @check @insert (response)');
	ROUTE('+POST    /api/op/users/{id}/            *Users              --> @check @patch (response)');
	ROUTE('+PATCH   /api/op/users/{id}/            *Users              --> @check @patch (response)');
	ROUTE('+DELETE  /api/op/users/{id}/            *Users              --> @remove');
	ROUTE('+POST    /api/op/users/assign/          *Users/Assign       --> @exec');
	ROUTE('+POST    /api/op/reports/               *Users/Reports      --> @insert', 1024 * 2); // 2 MB

	// Users/Groups
	ROUTE('+GET     /api/op/groups/                *Users/Groups       --> @query');
	ROUTE('+PATCH   /api/op/groups/                *Users/Groups       --> @patch');
	ROUTE('+DELETE  /api/op/groups/                *Users/Groups       --> @remove');

	// Codelists
	ROUTE('+GET     /api/op/companies/             *Users              --> @companies');
	ROUTE('+GET     /api/op/locations/             *Users              --> @locations');
	ROUTE('+GET     /api/op/positions/             *Users              --> @positions');
	ROUTE('+GET     /api/op/groupids/              *Users              --> @groupids');

	// Apps
	ROUTE('+GET     /api/op/apps/                  *Apps               --> @query');
	ROUTE('+GET     /api/op/apps/{id}/             *Apps               --> @read');
	ROUTE('+GET     /api/op/apps/meta/             *Apps               --> @meta');
	ROUTE('+POST    /api/op/apps/                  *Apps               --> @check @refresh @insert (response)');
	ROUTE('+POST    /api/op/apps/{id}/             *Apps               --> @check @refresh @update (response)');
	ROUTE('+DELETE  /api/op/apps/{id}/             *Apps               --> @remove');

	// Settings
	ROUTE('+GET     /api/op/settings/              *Settings           --> @read');
	ROUTE('+POST    /api/op/settings/              *Settings           --> @save');
	ROUTE('+POST    /api/op/settings/smtp/         *Settings/SMTP      --> @exec');

	// For unauthorized
	ROUTE('-POST    /api/login/                    *Users/Login        --> @exec');
	ROUTE('-POST    /api/login/otp/                *Users/Login        --> @otp');
	ROUTE('-POST    /api/password/                 *Users/Password     --> @exec');

	// Acount
	ROUTE('+GET     /api/account/                  *Account            --> @read');
	ROUTE('+POST    /api/account/                  *Account            --> @check @save (response)');
	ROUTE('+GET     /api/account/totp/             *Account/Totp       --> @generate');
	ROUTE('+POST    /api/account/totp/verify/      *Account/Totp       --> @verify');
	ROUTE('+POST    /api/account/status/           *Account/Status     --> @save');

	ROUTE('+GET     /api/notifications/            *Apps/Notifications --> @query');

	// Profile
	ROUTE('+GET     /api/profile/',                json_profile_full);
	ROUTE('+GET     /api/profile/{id}/             *Apps               --> @run');
	ROUTE('+GET     /api/profile/{id}/favorite/    *Apps               --> @favorite');
	ROUTE('+GET     /api/profile/{id}/reset/       *Apps               --> @reset');
	ROUTE('+GET     /api/profile/{id}/mute/        *Apps               --> @mute');
	ROUTE('+POST    /api/profile/logger/           *Apps/Logs          --> @insert');
	ROUTE('+POST    /api/profile/apps/positions/   *Apps/Position      --> @save');
	ROUTE('+GET     /api/profile/live/',           json_profile);

	ROUTE('+POST    /api/upload/photo/',           json_upload_photo, 1024 * 2);
	ROUTE('+POST    /api/upload/background/',      json_upload_background, ['upload'], 1024 * 5);

	ROUTE('+GET     /api/op/meta/',                json_meta_query);
	ROUTE('+GET     /api/op/sessions/',            json_sessions);
	ROUTE('+DELETE  /api/op/sessions/{id}/',       json_sessions_remove);

	ROUTE('+GET     /api/op/members/               *Users/Team --> @query');
	ROUTE('+POST    /api/op/members/               *Users/Team --> @save');

	ROUTE('+POST    /api/op/config/                *Apps/Config        --> @save');
	ROUTE('+GET     /api/op/config/                *Apps/Config        --> @read');

	// Because of security reasons
	// ROUTE('+POST    /api/op/mail/                  *Mail               --> @send');

	ROUTE('+POST    /api/op/notify/{id}/                       *Apps/Notifications  --> @internal');
	ROUTE('+GET     /api/op/badges/{id}/                       *Apps/Badges         --> @internal');

	// External
	ROUTE('GET      /verify/',                            json_verify);
	ROUTE('GET      /api/verify/',                        json_verify);
	ROUTE('POST     /api/services/',                      json_service, ['raw']);
	ROUTE('GET      /api/online/{id}/',                   json_online);
	ROUTE('GET      /api/users/                           *Users               --> @public');
	ROUTE('GET      /api/apps/                            *Apps                --> @public');
	ROUTE('GET      /api/badges/                          *Apps/Badges         --> @exec');
	ROUTE('POST     /api/notify/                          *Apps/Notifications  --> @save');
	ROUTE('GET      /api/meta/                            *Meta                --> @read');
	ROUTE('GET      /api/unlock/                          *Account             --> @unlock');
	ROUTE('GET      /guest/',                             redirect_guest);

	// CORS
	CORS();
};

function json_verify() {
	var self = this;

	if (CONF.guest && MAIN.guest && self.query.accesstoken.endsWith('0-0-0')) {
		self.json(MAIN.metaguest());
		return;
	}

	FUNC.decodeauthtoken(self, function(obj) {
		var app = obj.app;
		var user = obj.user;
		if (user.online)
			self.json(FUNC.meta(app, user, true));
		else
			self.invalid('error-offline');
	});
}

function json_meta_query() {
	var self = this;
	if (self.user.directory) {
		var obj = MAIN.metadirectories[self.user.directory];
		self.json(obj ? obj : EMPTYOBJECT);
	} else
		self.json(MAIN.meta);
}

function json_upload_photo() {
	var self = this;
	var base64 = self.body.file;

	if (!base64) {
		$.invalid('error-file-type');
		return;
	}

	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.jpg';
	var path = PATH.public('photos');
	PATH.mkdir(path);
	base64.base64ToFile(U.join(path, id), () => self.json(id));
}

function json_upload_background() {
	var self = this;
	var file = self.files[0];

	if (file == null) {
		self.invalid('error-file-type');
		return;
	}

	var path = PATH.public('backgrounds');
	var id = NOW.format('yyyyMMddHHmm') + '_' + U.GUID(8) + '.' + U.getExtension(file.filename);

	PATH.mkdir(path);
	file.move(U.join(path, id), () => self.json(id));
}

function json_online(id) {
	var self = this;
	MAIN.session.contains2(id, function(err, user) {
		if (user) {
			ONLINE.online = user.online;
			ONLINE.dtlogged = user.dtlogged;
		} else {
			ONLINE.online = false;
			ONLINE.dtlogged = null;
		}
		self.json(ONLINE);
	});
}

function json_profile() {
	this.json(FUNC.profilelive(this.user), null, null, skip);
}

function json_profile_full() {
	var self = this;
	FUNC.profile(self.user, function(err, data) {
		data && (data.ip = self.ip);
		self.json(data);
	});
}

function skip(k, v) {
	return USERS_PROFILE_SKIP[k] ? undefined : v;
}

function json_sessions() {
	var self = this;
	MAIN.session.list(self.user.id, function(err, sessions) {
		var data = [];
		for (var i = 0; i < sessions.length; i++) {
			var item = sessions[i];
			data.push({ id: item.sessionid, note: item.note, used: item.used, created: item.created, current: item.sessionid === self.sessionid });
		}
		self.json(data);
	});
}

function json_sessions_remove(id) {
	var self = this;
	MAIN.session.get(id, function(err, item, meta) {
		if (meta && meta.id === self.user.id) {
			MAIN.session.remove(meta.sessionid);
			self.success(true, meta.sessionid === self.sessionid);
		} else
			self.invalid('error-session');
	});
}

function redirect_guest() {
	var self = this;
	CONF.guest && self.cookie(CONF.cookie, 'guest', '1 day');
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
			else
				OPERATION('api_' + serviceid, obj.app, self.callback(), self);
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
			self.invalid('error-services-endpoint').replace('@', service);
			return;
		}

		var headers = {};
		headers['X-OpenPlatform'] = MAIN.id + '-' + obj.user.directoryid + '-' + CONF.verifytoken + '-' + obj.user.id + '-' + app.servicetoken;
		headers['Content-Type'] = self.headers['content-type'];

		REQUEST(endpoint, REQUEST_FLAGS, self.body, function(err, response, status, headers) {

			if (err) {
				self.status = status < 400 ? 500 : status;
				self.invalid(err);
			} else {
				self.status = status;
				self.content(response, headers['content-type']);
			}

		}, null, headers);
	});
}