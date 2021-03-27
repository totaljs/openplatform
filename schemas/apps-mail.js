NEWSCHEMA('Apps/Mail', function(schema) {

	schema.define('email', 'Email', true);
	schema.define('subject', 'String(80)', true);
	schema.define('body', String, true);
	schema.define('type', ['html' , 'plain'])('html');

	schema.addWorkflow('exec', function($, model) {
		FUNC.decodetoken($, function(obj) {
			if (obj.app.allowmail) {
				var mail = model.type === 'html' ? MAIL(model.email, model.subject, 'mails/template', model, NOOP, $.user.language) : LOGMAIL(model.email, model.subject, model.body);
				mail.reply($.user.email);
				$.success();
			} else
				$.invalid('error-permissions');
		});
	});

});