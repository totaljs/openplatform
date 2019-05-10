const SKIP = { password: true, search: true, verifytoken: true };
const ONLINE = { online: true, dtlogged: null };
const USERS_LIST_FIELDS = { id: 1, statusid: 1, firstname: 1, lastname: 1, online: 1, sa: 1, blocked: 1, inactive: 1, company: 1, name: 1, items: 1, count: 1, page: 1, pages: 1, limit: 1 };

exports.install = function() {

	GROUP(['authorize'], function() {

		// Internal
		ROUTE('POST   /api/internal/apps/               *App          --> @refresh @save (response)');
		ROUTE('DELETE /api/internal/apps/{id}/          *App          --> @remove', [10000]);
		ROUTE('POST   /api/internal/apps/meta/          *AppMeta      --> @exec');
		ROUTE('POST   /api/internal/users/              *User         --> @save');
		ROUTE('DELETE /api/internal/users/{id}/         *User         --> @remove');

		ROUTE('POST   /api/internal/users/rename/       *UserRename   --> @exec');
		ROUTE('POST   /api/internal/users/notify/       *UserNotify   --> @exec');
		ROUTE('POST   /api/internal/users/apps/         *UserApps     --> @exec');

		ROUTE('GET    /api/internal/apps/{id}/',        json_apps_meta);
		ROUTE('GET    /api/internal/apps/',             json_apps_query);
		ROUTE('GET    /api/internal/users/{id}/',       json_users_read);
		ROUTE('GET    /api/internal/users/',            json_users_query);
		ROUTE('GET    /api/internal/meta/',             json_meta_query);

		ROUTE('GET    /api/account/                     *Account      --> @read');
		ROUTE('POST   /api/account/                     *Account      --> @save');
		ROUTE('POST   /api/account/status/              *Status       --> @save');
		ROUTE('GET    /api/notifications/               *Notification --> @query');

		ROUTE('GET    /api/internal/settings/           *Settings     --> @read');
		ROUTE('POST   /api/internal/settings/           *Settings     --> @save');
		ROUTE('POST   /api/internal/settings/smtp/      *SettingsSMTP --> @exec', [10000]);

		// Real-time operation
		ROUTE('GET    /api/profile/                     *Profile      --> @get');
		ROUTE('GET    /api/profile/{id}/                *App          --> @run');
		ROUTE('GET    /api/profile/{id}/favorite/       *App          --> @favorite');
		ROUTE('GET    /api/profile/{id}/mute/           *App          --> @mute');
		ROUTE('POST   /api/profile/logger/              *Logger       --> @insert');
		ROUTE('GET    /api/profile/live/',              json_profile);

		ROUTE('GET    /api/sessions/',                  json_sessions);
		ROUTE('DELETE /api/sessions/{id}/',             json_sessions_remove);

		ROUTE('/api/upload/photo/',                     json_upload_photo, ['post'], 1024 * 2);
		ROUTE('/api/upload/background/',                json_upload_background, ['post', 'upload'], 1024 * 5);
	});

	GROUP(['unauthorize'], function() {
		ROUTE('POST   /api/login/                       *Login        --> @exec');
		ROUTE('POST   /api/password/                    *Password     --> @exec');
	});

	// External
	ROUTE('GET    /api/verify/',                        json_verify);
	ROUTE('GET    /verify/',                            json_verify);
	ROUTE('GET    /api/online/{id}/',                   json_online);
	ROUTE('GET    /api/users/                           *User         --> @query');
	ROUTE('GET    /api/apps/                            *App          --> @query');
	ROUTE('GET    /api/badges/                          *Badge        --> @exec');
	ROUTE('POST   /api/notify/                          *Notification --> @save');
	ROUTE('POST   /api/config/                          *Config       --> @save');
	ROUTE('GET    /api/config/                          *Config       --> @get');
	ROUTE('GET    /api/meta/                            *Meta         --> @get');
	ROUTE('GET    /api/unlock/                          *Account      --> @unlock');

	// CORS
	CORS();
};

function json_verify() {
	var self = this;
	OP.decodeAuthToken(self.query.accesstoken, function(err, obj) {

		if (!obj) {
			self.invalid('error-invalid-accesstoken');
			return;
		}

		var app = obj.app;
		var user = obj.user;

		if (!user.online) {
			self.invalid('error-offline');
			return;
		}

		if (app.origin) {
			if (app.origin.indexOf(self.ip) == -1 && app.hostname !== self.ip) {
				self.invalid('error-invalid-origin');
				return;
			}
		} else if (app.hostname !== self.ip) {
			self.invalid('error-invalid-origin');
			return;
		} else if (user.inactive || user.blocked) {
			self.invalid('error-accessible');
			return;
		}

		self.json(OP.meta(app, user, true));
	});
}

function json_apps_query() {
	var self = this;
	if (self.user.sa) {
		FUNC.apps.query(self.query, self.callback());
	} else
		self.invalid('error-permissions');
}

function json_users_read(id) {
	var self = this;
	if (self.user.sa) {
		FUNC.users.get(id, function(err, user) {
			if (user)
				self.json(user, false, (k, v) => SKIP[k] ? undefined : v);
			else
				self.json(null);
		});
	} else
		self.invalid('error-permissions');
}

function json_users_query() {
	var self = this;
	if (self.user.sa) {
		if (self.user.directory)
			self.query.directory = self.user.directory;

		FUNC.users.query(self.query, function(err, users) {
			if (users)
				self.json(users, false, (k, v) => k >= 0 || USERS_LIST_FIELDS[k] ? v : undefined);
			else
				self.invalid(err);
		});

	} else
		self.invalid('error-permissions');
}

function json_meta_query() {
	var self = this;
	if (self.user.directory)
		self.json(G.metadirectories[self.user.directory] || EMPTYOBJECT);
	else
		self.json(G.meta, false);
}

function json_apps_meta(id) {
	var self = this;
	FUNC.apps.get(id, function(err, app) {
		if (app)
			self.json(OP.meta(app, self.user));
		else
			self.invalid('error-app-404');
	});
}

function json_upload_photo() {
	var self = this;
	FUNC.files.uploadphoto(self.body.file, function(err, id) {
		if (err)
			self.invalid(err);
		else
			self.json(id);
	});
}

function json_upload_background() {
	var self = this;
	var file = self.files[0];
	FUNC.files.uploadbackground(file, function(err, id) {
		if (err)
			self.invalid(err);
		else
			self.json(id);
	});
}

function json_online(id) {
	var self = this;
	FUNC.users.get(id, function(err, user) {
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
	this.json(OP.profilelive(this.user));
}

function json_sessions() {
	var self = this;
	OP.session.list(self.user.id, function(err, sessions) {
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
	OP.session.get(id, function(err, item, meta) {
		if (meta && meta.id === self.user.id) {
			OP.session.remove(meta.sessionid);
			self.success(true, meta.sessionid === self.sessionid);
		} else
			self.invalid('error-session');
	});
}
