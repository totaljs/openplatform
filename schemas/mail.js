NEWSCHEMA('Mail', function(schema) {

	schema.define('email', 'Email', true);
	schema.define('subject', 'String(80)', true);
	schema.define('body', String, true);
	schema.define('type', ['html' , 'plain'])('html');

	schema.addWorkflow('send', function($, model) {
		var mail = model.type === 'html' ? MAIL(model.email, model.subject, 'mails/template', model, NOOP, $.user.language) : LOGMAIL(model.email, model.subject, model.body);
		mail.reply($.user.email);
		$.success();
	});

});