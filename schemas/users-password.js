NEWSCHEMA('Users/Password', function(schema) {

	schema.define('name', 'String(120)', true);

	schema.addWorkflow('exec', function($) {

		var db = DBMS();
		db.read('tbl_user').where('login', $.model.name).fields('id,firstname,lastname,middlename,name,language,email,otp,inactive,blocked');
		db.error('error-credentials');
		db.callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			if (response.blocked) {
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
			model.login = $.model.name;
			model.token = ENCRYPTREQ($.req, { id: response.id, date: NOW, type: 'password' }, CONF.secretpassword);
			model.email = response.email;

			FUNC.log('password', response.id, response.name, $);
			EMIT('users/password', response.id);
			MAIL(model.email, '@(Password recovery)', '/mails/password', model, response.language);
			$.success();
		});
	});

});