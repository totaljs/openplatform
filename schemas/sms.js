NEWSCHEMA('SMS', function(schema) {

	schema.define('to', 'Phone', true);
	schema.define('body', String, true);

	schema.addWorkflow('send', function($, model) {
		if (CONF.totalapi) {
			model.from = CONF.name;
			TotalAPI('sms', model, $.done());
		} else
			$.invalid('@(Invalid Total API token)');
	});

});