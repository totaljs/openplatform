exports.install = function() {

	GROUP(['authorize'], function() {
		ROUTE('GET /');
		ROUTE('GET /users/');
		ROUTE('GET /apps/');
		ROUTE('GET /settings/');
		ROUTE('GET /info/', info);
		ROUTE('GET /account/');
		ROUTE('GET /welcome/');
	});

	ROUTE('GET /*',       login, ['unauthorize']);
	ROUTE('GET /logoff/', logoff);
	ROUTE('GET /lock/',   lock);
	ROUTE('GET /marketplace/');

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
		var data = F.decrypt(self.query.token, CONF.secretpassword);
		if (data && data.date.add('2 days') > NOW) {
			FUNC.users.get(data.id, function(err, user) {

				if (user == null) {
					$.invalid('error-users-404');
					return;
				}

				OP.cookie(self, user, null, function() {
					self.redirect(self.url + (data.type === 'password' ? '?password=1' : '?welcome=1'));
				}, (self.headers['user-agent'] || '').parseUA() + ' ({0})'.format(self.ip));
			});
			return;
		}
	}

	if (self.req.locked) {
		// locked
		self.view('locked');
		return;
	}

	if (self.url !== '/')
		self.status = 401;

	self.view('login');
}

function logoff() {
	var self = this;
	if (self.user)
		OP.logout(self);
	else
		self.redirect('/');
}

ON('users.refresh', function(userid, removed) {
	if (userid) {
		if (removed)
			OP.session.remove2(userid);
		else
			OP.session.release2(userid);
	} else
		OP.session.release(null);
});

ON('settings.update', function() {
	// Nothing to do
});

function notify(userid, appid, clear) {
	OP.session.release2(userid);
}

ON('users.notify', notify);
ON('users.badge', notify);

function info() {
	var self = this;
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

	OP.session.count(function(err, count) {
		model.sessions = count;
		self.view('info', model);
	});
}

function lock() {
	var self = this;
	OP.session.get(self.sessionid, function(err, profile, meta) {
		meta.settings = (meta.settings || '').replace('locked:0', 'locked:1');
		if (meta.settings.indexOf('locked:1') === -1)
			meta.settings = (meta.settings ? ';' : '') + 'locked:1';
		OP.session.set(meta.sessionid, meta.id, profile, CONF.cookie_expiration || '1 month', meta.note, meta.settings);
		self.redirect('/');
	});
}