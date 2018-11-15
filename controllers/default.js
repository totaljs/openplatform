const WSOPEN = { TYPE: 'open', body: null };
const WSPROFILE =  { TYPE: 'profile', body: null };
const WSNOTIFICATIONS = { TYPE: 'notifications', body: null };
const WSNOTIFY = { TYPE: 'notify', body: { count: 0, app: { id: null, count: 0 }}};
const WSLOGOFF = { TYPE: 'logoff' };
const COOKIES = { security: 1, httponly: true };

var WS;

exports.install = function() {

	GROUP(['authorize'], function() {
		ROUTE('GET /');
		ROUTE('GET /users/');
		ROUTE('GET /apps/');
		ROUTE('GET /settings/');
		ROUTE('GET /account/');
		WEBSOCKET('/', realtime, ['json']);
	});

	ROUTE('GET /*', login, ['unauthorize']);
	ROUTE('GET /logoff/', logoff);

	LOCALIZE('/pages/*.html');
	LOCALIZE('/forms/*.html');

	FILE('/manifest.json', manifest);
};

function manifest(req, res) {
	var meta = {};
	meta.name = CONF.name;
	meta.short_name = CONF.name;
	meta.icons = [{ src: '/icon.png', size: '500x500', type: 'image/png' }];
	meta.start_url = '/';
	meta.display = 'standalone';
	res.json(meta);
}

function login() {
	var self = this;

	if (self.query.token) {
		var data = F.decrypt(self.query.token, CONF.secret_password);
		if (data && data.date.add('2 days') > NOW) {
			var cookie = {};
			cookie.id = data.id;
			cookie.date = NOW;
			cookie.ua = (self.req.headers['user-agent'] || '').substring(0, 20);
			self.cookie(CONF.cookie, F.encrypt(cookie), '1 month', COOKIES);
			self.redirect(self.url + (data.type === 'password' ? '?password=1' : '?welcome=1'));
			return;
		}
	}

	self.view('login');
}

function logoff() {
	var self = this;
	self.cookie(CONF.cookie, '', '-5 days');
	FUNC.users.logout(self.user, self);
}

function realtime() {
	var self = this;

	WS = self;

	self.autodestroy(() => WS = null);

	self.on('open', function(client) {

		if (client.user.blocked) {
			client.close('blocked');
			return;
		}

		client.id = client.user.id;
		// client.user.online = true;
		// client.user.countsessions++;

		FUNC.users.online(client.user, true, function() {
			OP.profile(client.user, function(err, profile) {
				WSPROFILE.body = profile;
				client.send(WSPROFILE);
			});
		});
	});

	self.on('close', function(client) {

		FUNC.users.online(client.user, false);

		// client.user.countsessions--;
		// if (client.user.countsessions <= 0) {
		// 	client.user.online = false;
		// 	client.user.countsessions = 0;
		// }
	});

	self.on('message', function(client, message) {

		switch (message.TYPE) {

			// Open app
			case 'open':

				switch (message.id) {
					case '_users':
					case '_apps':
					case '_settings':
					case '_account':

						if (message.id !== '_account' && !client.user.sa)
							return;

						var user = client.user;
						WSOPEN.body = { datetime: NOW, ip: client.ip, accesstoken: message.id + '-' + user.accesstoken + '-' + user.id + '-' + user.verifytoken, url: '/{0}/'.format(message.id.substring(1)), settings: null, id: message.id };
						WSOPEN.body.ip = client.ip;
						WSOPEN.body.href = '';

						client.send(WSOPEN);
						return;
				}

				if (client.user.apps[message.id]) {
					FUNC.apps.get(message.id, function(err, app) {

						if (app) {
							WSOPEN.body = OP.meta(app, client.user);
							WSOPEN.body.ip = client.ip;
							WSOPEN.body.href = message.href;

							LOGGER('logs', '[{0}]'.format(client.user.id + ' ' + client.user.name), '({1} {0})'.format(app.frame, app.id), 'open app');

							if (WSOPEN.body) {

								client.send(WSOPEN);
								client.user.apps[message.id].countnotifications = 0;
								client.user.apps[message.id].countbadges = 0;

								// Stats
								var db = NOSQL('apps');
								db.counter.hit('all');
								db.counter.hit(message.id);
							}
						}
					});
				}

				break;

			case 'log':
				FUNC.logger('logs', '[{0}]'.format(client.user.id + ' ' + client.user.name), '({1} {0})'.format(message.appurl, message.appid), message.body);
				break;

			case 'notifications':
				$QUERY('Notification', null, function(err, response) {
					if (response) {
						WSNOTIFICATIONS.body = response;
						client.send(WSNOTIFICATIONS);
					}
				}, client);
				break;

			// Get user's profile
			case 'profile':
				// returns profile's detail
				OP.profile(client.user, function(err, data) {
					if (data) {
						WSPROFILE.body = data;
						WSPROFILE.body.ip = client.ip;
						client.send(WSPROFILE);
					}
				});
				break;
		}

	});
}

ON('apps.refresh', function() {
	WS && WS.all(function(client) {
		OP.profile(client.user, function(err, profile) {
			WSPROFILE.body = profile;
			client.send(WSPROFILE);
		});
	});
});

ON('users.refresh', function(userid, removed) {
	WS && WS.all(function(client) {
		if (removed || client.user.blocked || client.user.inactive) {
			if (client.id === userid) {
				client.send(WSLOGOFF);
				setTimeout(() => client.close(), 100);
			}
		} else if (client.id === userid) {
			OP.profile(client.user, function(err, profile) {
				WSPROFILE.body = profile;
				client.send(WSPROFILE);
			});
		}
	});
});

function notify(userid, appid) {
	if (WS) {
		var conn = WS.find(userid);
		conn && FUNC.users.get(userid, function(err, user) {
			if (user) {
				WSNOTIFY.body.count = user.countnotifications;
				WSNOTIFY.body.app.id = appid;
				WSNOTIFY.body.app.count = appid ? user.apps[appid].countnotifications : 0;
				WSNOTIFY.body.app.badges = appid ? user.apps[appid].countbadges : 0;
				conn.send(WSNOTIFY);
			}
		});
	}
}

ON('users.notify', notify);
ON('users.badge', notify);