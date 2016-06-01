exports.install = function() {
	F.route('/api/serviceworker/');
	F.route('/api/notification/');
	F.route('/api/widget/');

	F.route('/api/applications/', json_applications);
	F.route('/api/users/', json_users);
};

function json_applications() {

}

function json_users() {

}