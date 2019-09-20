var DDOS = {};

NEWSCHEMA('Users/Login', function(schema) {

	schema.define('name', 'String(120)', true);
	schema.define('password', 'String(50)', true);

	schema.addWorkflow('exec', function($) {

		if (DDOS[$.ip] > 5) {
			$.invalid('error-blocked-ip');
			return;
		}

		FUNC.login($.model.name, $.model.password, function(err, userid) {

			if (!userid) {

				if (DDOS[$.ip])
					DDOS[$.ip]++;
				else
					DDOS[$.ip] = 1;

				$.invalid('error-credentials');
				return;
			}

			// ONE-TIME PASSWORD
			if (userid === 'otp') {
				$.success('otp');
				return;
			}

			DBMS().one('tbl_user').where('id', userid).fields('id,name,blocked,inactive').callback(function(err, response) {

				if (response == null) {

					if (DDOS[$.ip])
						DDOS[$.ip]++;
					else
						DDOS[$.ip] = 1;

					$.invalid('error-credentials');
					return;
				}

				if (response.blocked) {
					$.invalid('error-blocked');
					return;
				}

				if (response.inactive) {
					$.invalid('error-inactive');
					return;
				}

				var opt = {};
				opt.name = CONF.cookie || '__opu';
				opt.key = CONF.cookie_key || 'auth';
				opt.sessionid = UID();
				opt.id = response.id;
				opt.expire = CONF.cookie_expiration || '3 days';
				opt.data = null;
				opt.note = ($.headers['user-agent'] || '').parseUA() + ' (' + $.ip + ')';
				opt.settings = 'locked:0';

				EMIT('users/login', response.id);
				FUNC.log('login', response.id, response.name, $);
				MAIN.session.setcookie($.controller, opt, $.done());
			});

		});

	});

	schema.addWorkflow('otp', function($) {

		FUNC.loginotp($.model.name, $.model.password, function(err, userid) {

			if (err) {
				$.invalid(err);
				return;
			}

			if (!userid) {
				$.invalid('error-credentials');
				return;
			}

			DBMS().one('tbl_user').where('id', userid).fields('id,name,blocked,inactive').callback(function(err, response) {

				if (response == null) {
					$.invalid('error-credentials');
					return;
				}

				if (response.blocked) {
					$.invalid('error-blocked');
					return;
				}

				if (response.inactive) {
					$.invalid('error-inactive');
					return;
				}

				var opt = {};
				opt.name = CONF.cookie || '__opu';
				opt.key = CONF.cookie_key || 'auth';
				opt.sessionid = UID();
				opt.id = response.id;
				opt.expire = CONF.cookie_expiration || '3 days';
				opt.data = null;
				opt.note = ($.headers['user-agent'] || '').parseUA() + ' (' + $.ip + ')';
				opt.settings = 'locked:0';

				EMIT('users/login', response.id);
				FUNC.log('login', response.id, response.name, $);
				MAIN.session.setcookie($.controller, opt, $.done());
			});

		});
	});

});

ON('service', function(counter) {
	if (counter % 15 === 0)
		DDOS = {};
});