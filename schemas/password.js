NEWSCHEMA('Password', function(schema) {

	schema.define('name', 'String(50)', true);

	schema.addWorkflow('exec', function($) {
		FUNC.users.password($.model.name, function(err, user) {
			if (err) {
				$.invalid(err);
				return;
			} else if (user) {
				if (user.blocked) {
					$.invalid('error-blocked');
					return;
				} else if (user.inactive) {
					$.invalid('error-inactive');
					return;
				} else {
					var model = {};
					model.firstname = user.firstname;
					model.lastname = user.lastname;
					model.login = user.login;
					model.token = F.encrypt({ id: user.id, date: NOW, type: 'password' }, CONFIG.secretpassword);
					model.email = user.email;
					MAIL(model.email, '@(Password recovery)', '/mails/password', model, user.language);
					$.success();
					return;
				}
			}
			$.invalid('error-credentials');
		});
	});

});