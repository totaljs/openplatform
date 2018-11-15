const COOKIEOPTIONS = { httponly: true, security: 'lax' };

NEWSCHEMA('Login', function(schema) {

	schema.define('name', 'String(120)', true);
	schema.define('password', 'String(50)', true);

	schema.addWorkflow('exec', function($) {
		FUNC.users.login($.model.name, $.model.password, function(err, user) {

			if (user) {

				if (user.blocked) {
					$.invalid('error-blocked');
					return;
				}

				if (user.inactive) {
					$.invalid('error-inactive');
					return;
				}

				// Updates token
				user.verifytoken = U.GUID(15);

				FUNC.users.set(user, ['verifytoken'], function(err) {

					if (err) {
						$.invalid(err);
						return;
					}

					var cookie = {};
					cookie.id = user.id;
					cookie.date = F.datetime;
					cookie.ua = ($.controller.req.headers['user-agent'] || '').substring(0, 20);
					$.controller.cookie(CONF.cookie, F.encrypt(cookie), CONF.cookie_expiration || '1 month', COOKIEOPTIONS);
					$.success();
				});
			} else
				$.invalid('error-credentials');
		});
	});
});