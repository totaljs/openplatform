exports.install = function() {
	F.route('/*', 'index', ['authorize']);
	F.route('/login/', redirect);

	// Localization
	F.localize('/templates/*.html', ['compress']);

	// File routing
	F.file('/photos/*.jpg', photo);
};

function redirect() {
	var self = this;
	self.cookie('__uop', F.encrypt({ id: 'admin:admin', expire: new Date().add('5 days') }, 'UsSer'), '5 days');
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