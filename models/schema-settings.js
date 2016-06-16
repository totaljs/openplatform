NEWSCHEMA('Settings').make(function(schema) {

	schema.define('name', 'String(50)', true);
	schema.define('author', 'String(50)', true);
	schema.define('url', 'Url', true);
	schema.define('email', 'Email', true);
	schema.define('smtp', 'String(60)', true);
	schema.define('smtpsettings', 'String(300)', true);

	schema.setGet(function(error, model, controller, callback) {
		model.name = F.config.name;
		model.url = F.config.url;
		model.author = F.config.author;
		model.email = F.config.email;
		model.smtp = F.config['mail.smtp'];
		model.smtpsettings = F.config['mail.smtp.options'];
		callback();
	});

	schema.addWorkflow('smtp', function(error, model, controller, callback) {
		var options = model.smtpsettings.parseJSON();
		Mail.try(model.smtp, options, function(err) {
			if (!err)
				return callback(SUCCESS(true));
			error.push('error-settings-smtp');
			error.replace('@', err.toString());
			callback();
		});
	});

	schema.setSave(function(error, model, controller, callback) {

		if (model.url.endsWith('/'))
			model.url = model.url.substring(0, model.url.length - 1);

		F.config.url = model.url;
		F.config.name = model.name;
		F.config.author = model.author;
		F.config.email = model.email;
		F.config['mail.smtp'] = model.smtp;
		F.config['mail.smtp.options'] = model.smtpsettings;
		OPENPLATFORM.settings.save(() => OPENPLATFORM.settings.load());
		callback(SUCCESS(true));
	});
});