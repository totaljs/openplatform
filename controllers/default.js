exports.install = function() {

	ROUTE('+GET  /', index);
	ROUTE('+GET  /admin/');
	ROUTE('+GET  /account/');
	ROUTE('+GET  /welcome/');

	ROUTE('GET /*', login, ['unauthorize']);
	ROUTE('GET /marketplace/');
	ROUTE('GET /logout/', logout);
	ROUTE('GET /lock/', lock);

	FILE('/manifest.json', manifest);

	ROUTE('#404', process404);
};

function index() {

	var desktop = this.user.desktop;
	this.view(desktop === 3 ? 'portal' : desktop === 2 ? 'tabbed' : 'windowed');
}

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

	if (self.req.locked) {
		// locked
		self.view('locked');
		return;
	}

	if (self.query.token) {
		var data = DECRYPTREQ(self.req, self.query.token, CONF.secretpassword);
		if (data && data.date.add('2 days') > NOW) {
			FUNC.cookie(self, data.id, null, function() {
				self.redirect(self.url + (data.type === 'password' ? '?password=1' : '?welcome=1'));
			}, (self.headers['user-agent'] || '').parseUA() + ' ({0})'.format(self.ip));
			return;
		}
	}

	if (self.url !== '/')
		self.status = 401;

	self.view('login');
}

function logout() {
	var self = this;
	if (self.user)
		FUNC.logout(self);
	else
		self.redirect('/');
}

function lock() {
	var self = this;
	MAIN.session.get(self.sessionid, function(err, profile, meta) {
		meta.settings = (meta.settings || '').replace('locked:0', 'locked:1');
		if (meta.settings.indexOf('locked:1') === -1)
			meta.settings = (meta.settings ? ';' : '') + 'locked:1';
		var expire = CONF.cookie_expiration || '3 days';
		MAIN.session.set(meta.sessionid, meta.id, profile, expire, meta.note, meta.settings);
		self.redirect('/');
	});
}

function process404() {

	var self = this;

	if (self.url.indexOf('/photos/') !== -1 && self.url.lastIndexOf('.jpg') !== -1) {
		self.file('/img/photo.jpg');
		return;
	}

	self.status = 404;
	self.plain('404: The resource not found');
}