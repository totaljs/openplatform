NEWSCHEMA('Password').make(function(schema) {

	schema.define('name', 'String(50)', true);

	schema.addWorkflow('exec', function($) {

		var user = F.global.users.findItem(n => n.login === $.model.name);
		if (user) {
			if (user.blocked) {
				$.error.push('error-blocked');
			} else if (user.inactive) {
				$.error.push('error-inactive');
			} else {
				var model = {};
				model.firstname = user.firstname;
				model.lastname = user.lastname;
				model.login = user.login;
				model.token = F.encrypt({ id: user.id, date: F.datetime, type: 'password' }, 'token');
				model.email = user.email;
				F.mail(model.email, '@(Password recovery)', '/mails/password', model, user.language);
			}
		} else
			$.error.push('error-credentials');
		$.success();
	});
});