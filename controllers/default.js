const WSPROFILE =  { TYPE: 'profile' };
const WSSETTINGS =  { TYPE: 'settings', body: {} };
const WSNOTIFY = { TYPE: 'notify', body: { count: 0, app: { id: null, count: 0 }}};
const WSLOGOFF = { TYPE: 'logoff' };
const COOKIES = { security: 1, httponly: true };
const session = SESSION('users');

var WS;

exports.install = function() {

	GROUP(['authorize'], function() {
		ROUTE('GET /');
		ROUTE('GET /users/');
		ROUTE('GET /apps/');
		ROUTE('GET /settings/');
		ROUTE('GET /info/', info);
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
			FUNC.users.get(data.id, function(err, user) {

				if (user == null) {
					$.invalid('error-users-404');
					return;
				}

				OP.cookie(self, user, null, function() {
					self.redirect(self.url + (data.type === 'password' ? '?password=1' : '?welcome=1'));
				}, 'Password recovery');
			});
			return;
		}
	}

	self.view('login');
}

function logoff() {
	var self = this;
	self.cookie(CONF.cookie, '', '-5 days');
	OP.session.remove(self.req.$sessionid);
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
		FUNC.users.online(client.user, true);
		client.send(WSPROFILE);
	});

	self.on('close', function(client) {
		FUNC.users.online(client.user, false);
	});
}

ON('apps.refresh', function() {
	WS && WS.send(WSPROFILE);
});

ON('users.refresh', function(userid, removed) {

	if (!WS)
		return;

	if (!userid) {

		// Refresh all connections
		var processed = new Set();

		WS.all().wait(function(client, next) {

			if (!client || !client.user || processed.has(client.user))
				return next();

			processed.add(client.user);
			FUNC.users.get(client.user.id, function(err, user) {

				if (err || !user)
					return next();

				session.set2(user.id, user, function() {
					client.user = user;
					client.send(WSPROFILE);
					next();
				});
			});

		});

		return;
	}

	var clients;

	WS.all(function(client) {
		if (client.id === userid) {
			if (clients)
				clients.push(client);
			else
				clients = [client];
		}
	});

	if (!clients || !clients.length)
		return;

	FUNC.users.get(userid, function(err, user) {
		user && session.set2(user.id, user);
		for (var i = 0; i < clients.length; i++)
			clients[i].send(user ? WSPROFILE : WSLOGOFF);
	});
});

ON('settings.update', function() {
	WS && FUNC.settings.get(function(err, response) {
		if (response) {
			var body = WSSETTINGS.body;
			body.name = response.name;
			body.url = response.url;
			body.email = response.email;
			body.test = response.test;
			body.background = response.background;
			body.colorscheme = response.colorscheme;
			WS.send(WSSETTINGS);
		}
	});
});

function notify(userid, appid, clear) {

	if (!WS)
		return;

	var clients;

	WS.all(function(client) {
		if (client.user.id === userid) {
			if (clients)
				clients.push(client);
			else
				clients = [client];
		}
	});

	if (!clients || !clients.length)
		return;

	FUNC.users.get(userid, function(err, user) {
		if (user) {
			for (var i = 0; i < clients.length; i++) {
				var client = clients[i];
				WSNOTIFY.body.count = clear ? 0 : user.countnotifications;
				WSNOTIFY.body.app.id = appid;
				WSNOTIFY.body.app.count = clear ? 0 : appid ? user.apps[appid].countnotifications : 0;
				WSNOTIFY.body.app.badges = clear ? 0 : appid ? user.apps[appid].countbadges : 0;
				client.send(WSNOTIFY);
			}
		}
	});
}

ON('users.notify', notify);
ON('users.badge', notify);

function info() {
	var memory = process.memoryUsage();
	var model = {};
	model.memoryTotal = (memory.heapTotal / 1024 / 1024).floor(2);
	model.memoryUsage = (memory.heapUsed / 1024 / 1024).floor(2);
	model.memoryRss = (memory.rss / 1024 / 1024).floor(2);
	model.node = process.version;
	model.version = 'v' + F.version_header;
	model.platform = process.platform;
	model.processor = process.arch;
	model.uptime = Math.floor(process.uptime() / 60);
	var conn = F.connections['/#get-authorize'];
	model.connections = conn ? conn.online : 0;
	model.ip = this.ip;
	this.view('info', model);
}