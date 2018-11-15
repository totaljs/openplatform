const COOKIEOPTIONS = { httponly: true, security: 'lax' };

NEWSCHEMA('Login', function(schema) {

	schema.define('name', 'String(120)', true);
	schema.define('password', 'String(50)', true);

	schema.addWorkflow('exec', function($) {
		OP.login($.model.name, $.model.password, function(err, user) {
			if (user) {
				if (user.blocked) {
					$.invalid('error-blocked');
				} else if (user.inactive) {
					$.invalid('error-inactive');
				} else {
					var cookie = {};
					cookie.id = user.id;
					cookie.date = F.datetime;

					// Updates token
					user.verifytoken = U.GUID(15);

					// Creates auth cookie
					$.controller.cookie(F.config.cookie, F.encrypt(cookie), F.config['cookie-expiration'] || '1 month', COOKIEOPTIONS);
					$.success();
				}
			} else
				$.invalid('error-credentials');
		});
	});
});