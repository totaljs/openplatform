NEWSCHEMA('Users/Password', function(schema) {

	schema.define('name', 'String(120)', true);

	ON('configure', function() {
		CONF.language && schema.setResource(CONF.language);
	});

	schema.addWorkflow('exec', function($, model) {

		if (CONF.allowpassword === false) {
			$.invalid('error-permissions');
			return;
		}

		var db = DBMS();
		db.read('tbl_user').where('login', model.name).fields('id,firstname,lastname,middlename,name,language,email,otp,inactive,blocked,dn').error('error-credentials').data(response => db.log($, model, response.name));
		db.callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			if (response.dn) {
				$.invalid('error-password-dn');
				return;
			} else if (response.blocked) {
				$.invalid('error-blocked');
				return;
			} else if (response.inactive) {
				$.invalid('error-inactive');
				return;
			}

			var model = {};
			model.firstname = response.firstname;
			model.lastname = response.lastname;
			model.middlename = response.middlename;
			model.name = response.name;
			model.login = model.name;
			model.token = ENCRYPT({ id: response.id, date: NOW, type: 'password' }, CONF.secretpassword);
			model.email = response.email;

			EMIT('users/password', response.id);
			MAIL(model.email, '@(Password recovery)', '/mails/password', model, response.language);
			$.success();
		});
	});

});