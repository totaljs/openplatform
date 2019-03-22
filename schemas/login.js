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


				var opt = {};
				opt.name = CONF.cookie;
				opt.key = CONF.cookie_key || 'auth';
				opt.sessionid = UID();
				opt.id = user.id;
				opt.expire = CONF.cookie_expiration || '1 month';
				opt.data = user;
				opt.note = 'Login form';

				OP.session.setcookie($.controller, opt, function() {
					user.verifytoken = U.GUID(15);
					FUNC.users.set(user, ['verifytoken'], NOOP);
					$.success();
				});

			} else
				$.invalid('error-credentials');
		});
	});
});