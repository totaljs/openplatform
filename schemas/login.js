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

				FUNC.sessions.get(user.id, function(err, session) {

					var done = function() {
						var cookie = {};
						cookie.id = user.id;
						cookie.date = NOW;
						cookie.ua = ($.controller.req.headers['user-agent'] || '').substring(0, 20);
						$.controller.cookie(CONF.cookie, F.encrypt(cookie), CONF.cookie_expiration || '1 month', COOKIEOPTIONS);
						$.success();
					};

					if (session) {
						session.verifytoken = U.GUID(15);
						FUNC.users.set(session, ['verifytoken'], function(err) {
							if (err)
								$.invalid(err);
							else
								done();
						});
					} else
						done();

				});
			} else
				$.invalid('error-credentials');
		});
	});
});