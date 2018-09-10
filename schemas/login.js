const COOKIEOPTIONS = { httponly: true, security: 'lax' };

NEWSCHEMA('Login').make(function(schema) {

	schema.define('name', 'String(50)', true);
	schema.define('password', 'String(50)', true);

	schema.addWorkflow('exec', function($) {

		var password = $.model.password.sha256();
		var user = F.global.users.findItem(n => n.login === $.model.name && n.password === password);
		if (user) {
			if (user.blocked) {
				$.error.push('error-blocked');
			} else if (user.inactive) {
				$.error.push('error-inactive');
			} else {
				var cookie = {};
				cookie.id = user.id;
				cookie.date = F.datetime;
				$.controller.cookie(F.config.cookie, F.encrypt(cookie), F.config['cookie-expiration'] || '1 month', COOKIEOPTIONS);
			}
		} else
			$.error.push('error-credentials');
		$.success();
	});


});