exports.install = function() {
	// Common routes
	F.route('/',        view_login, ['unauthorize']);
	F.route('/*',      'index',     ['authorize']);
	F.route('/logoff/', logoff,     ['authorize']);

	// Localization for client-side templates
	F.localize('/templates/*.html', ['compress']);

	// Photo handling
	F.file('/photos/*.jpg', photo);
};

// Process user's photos
function photo(req, res) {
	var id = req.split[2];
	var path = F.path.public(req.url.substring(1));

	var index = path.lastIndexOf('?');
	if (index !== -1)
		path = path.substring(0, index);

	F.path.exists(path, function(e) {
		if (e)
			return res.file(path);
		res.file(F.path.public('img/face.jpg'));
	});
}

// Performs sign out
function logoff() {
	var self = this;
	self.cookie(CONFIG('cookie'), '', '-1 day');
	self.user.logoff();
	self.redirect('/');
}

// Returns login form or can perform auto-login according to `token` in query string
function view_login() {
	var self = this;

	if (!self.query.token) {
		self.view('login');
		return;
	}

	GETSCHEMA('Login').workflow2('token', self, function(err, response) {
		if (err)
			return self.view('login');
		self.redirect('/account/?password=1');
	});
}