exports.install = function() {
	F.route('/*', 'index', ['authorize']);
	F.route('/login/', redirect);
};

function redirect() {
	var self = this;
	self.cookie('__uop', F.encrypt({ id: 'admin:admin', expire: new Date().add('5 days') }, 'UsSer'), '5 days');
	self.redirect('/');
}