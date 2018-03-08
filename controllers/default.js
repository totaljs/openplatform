const WSOPEN = { TYPE: 'open', body: null };
const WSPROFILE =  { TYPE: 'profile', body: null };
const WSNOTIFICATIONS = { TYPE: 'notifications', body: null };
const WSNOTIFY = { TYPE: 'notify', body: { count: 0, app: { id: null, count: 0 }}};
const WSLOGOFF = { TYPE: 'logoff' };

var WS;

exports.install = function() {

	GROUP(['authorize'], function() {
		ROUTE('/*', 'index');
		WEBSOCKET('/', realtime, ['json']);
	});

	ROUTE('/*', login, ['unauthorize']);

	LOCALIZE('/pages/*.html');
	LOCALIZE('/forms/*.html');
	REDIRECT('/logoff/', '/');
};

function login() {
	var self = this;

	if (self.query.token) {
		var data = F.decrypt(self.query.token, 'token');
		if (data && data.date.add('5 days') > F.datetime) {
			var cookie = {};
			cookie.id = data.id;
			cookie.date = F.datetime;
			self.cookie(F.config.cookie, F.encrypt(cookie), '1 month');
			self.redirect(self.url + (data.type === 'password' ? '?password=1' : ''));
			return;
		}
	}

	self.view('login');
}

function realtime() {
	var self = this;

	WS = self;

	self.autodestroy(() => WS = null);

	self.on('open', function(client) {

		if (client.user.blocked) {
			client.close();
			return;
		}

		client.user.online = true;
		WSPROFILE.body = OP.profile(client.user);
		client.send(WSPROFILE);
	});

	self.on('close', function(client) {
		client.user.online = false;
	});

	self.on('message', function(client, message) {

		switch (message.TYPE) {

			// Open app
			case 'open':

				if (client.user.apps[message.id]) {
					var app = F.global.apps.findItem('id', message.id);
					WSOPEN.body = OP.meta(app, client.user);
					WSOPEN.body.ip = client.ip;
					WSOPEN.body.href = message.href;

					if (WSOPEN.body) {
						client.send(WSOPEN);
						client.user.apps[message.id].countnotifications = 0;

						// Stats
						var db = NOSQL('apps');
						db.counter.hit('all');
						db.counter.hit(message.id);
					}
				}

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
				WSPROFILE.body = OP.profile(client.user);
				WSPROFILE.body.ip = client.ip;
				client.send(WSPROFILE);
				break;
		}

	});
}

ON('apps.refresh', function() {
	WS && WS.all(function(client) {
		WSPROFILE.body = OP.profile(client.user);
		client.send(WSPROFILE);
	});
});

ON('users.refresh', function(user, removed) {
	WS && WS.all(function(client) {
		if (removed || client.user.blocked || client.user.inactive) {
			if (client.user.id === user) {
				client.send(WSLOGOFF);
				setTimeout(() => client.close(), 100);
				return;
			}
		} else if (client.user.id === user.id) {
			WSPROFILE.body = OP.profile(client.user);
			client.send(WSPROFILE);
		}
	});
});

ON('users.notify', function(user, app) {
	if (WS) {
		WSNOTIFY.body.count = user.countnotifications;
		WSNOTIFY.body.app.id = app;
		WSNOTIFY.body.app.count = app ? user.apps[app].countnotifications : 0;
		WS.send(WSNOTIFY);
	}
});