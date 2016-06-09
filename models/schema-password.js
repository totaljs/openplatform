NEWSCHEMA('Password').make(function(schema) {

	schema.define('login', 'String(100)', true);

	schema.addWorkflow('exec', function(error, model, controller, callback) {
		var user = USERS.findItem('login', model.login);
		if (!user) {
			error.push('error-login-notfound');
			return callback();
		}

		if (user.blocked) {
			error.push('error-login-blocked');
			return callback();
		}

		user.tokenizer();
		F.mail(user.email, '@(Reset password)', '~mails/password', user, user.language);
		callback(SUCCESS(true, user.email));
	});
});
