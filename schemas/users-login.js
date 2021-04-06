var DDOS = {};

NEWSCHEMA('Users/Login', function(schema) {

	schema.define('name', 'String(120)', true);
	schema.define('password', 'String(50)', true);

	ON('configure', function() {
		CONF.language && schema.setResource(CONF.language);
	});

	schema.addWorkflow('exec', function($, model) {

		if (DDOS[$.ip] > 5) {
			$.invalid('error-blocked-ip');
			return;
		}

		FUNC.login(model.name, model.password, function(err, userid) {

			if (err) {
				$.invalid(err);
				return;
			}

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

			var db = DBMS();

			db.one('tbl_user').id(userid).fields('id,name,blocked,inactive').callback(function(err, response) {

				if (!response) {

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

				db.log($, model, response.name);
				EMIT('users/login', response.id);
				FUNC.cookie($, response.id, $.done());
			});

		});

	});

	schema.addWorkflow('otp', function($, model) {

		FUNC.loginotp(model.name, model.password, function(err, userid) {

			if (err) {
				$.invalid(err);
				return;
			}

			if (!userid) {
				$.invalid('error-credentials');
				return;
			}

			var db = DBMS();
			db.one('tbl_user').id(userid).fields('id,name,blocked,inactive').callback(function(err, response) {

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

				db.log($, model, response.name);
				EMIT('users/login', response.id);
				FUNC.cookie($, response.id, $.done());
			});

		});
	});

});

ON('service', function(counter) {
	if (counter % 15 === 0)
		DDOS = {};
});