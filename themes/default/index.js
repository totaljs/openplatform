exports.install = function() {
	F.merge('/default/css/default.css', '=default/public/css/bootstrap.min.css', '=default/public/css/ui.css', '=default/public/css/default.css');
	F.merge('/default/js/default.js', '=default/public/js/jctajr.min.js', '=default/public/js/ui.js', '=default/public/js/default.js');
};