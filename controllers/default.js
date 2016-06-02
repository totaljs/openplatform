exports.install = function() {
	F.route('/*', 'index', ['authorize']);
	F.route('/', 'login', ['unauthorize']);
	F.route('/login/', redirect);
	F.route('/logoff/', logoff, ['authorize']);

	// Localization
	F.localize('/templates/*.html', ['compress']);

	// File routing
	F.file('/photos/*.jpg', photo);
};

function redirect() {
	var self = this;
	self.cookie(CONFIG('cookie'), F.encrypt({ id: 'A349340384038', expire: new Date().add('5 days') }, 'UsSer'), '5 days');
	self.redirect('/');
}


function photo(req, res) {
	var id = req.split[2];
	var path = F.path.public(req.url.substring(1));

	var index = path.lastIndexOf('?');
	if (index !== -1)
		path = path.substring(0, index);

	F.path.exists(path, function(e) {
		if (e)
			res.file(path);
		else
			res.file(F.path.public('img/face.jpg'));
	});
}

function logoff() {
	var self = this;
	self.cookie(CONFIG('cookie'), '', '-1 day');
	self.user.logoff();
	self.redirect('/');
}