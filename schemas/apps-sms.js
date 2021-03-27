NEWSCHEMA('Apps/SMS', function(schema) {

	schema.define('to', 'Phone', true);
	schema.define('body', String, true);

	schema.addWorkflow('exec', function($, model) {
		FUNC.decodetoken($, function(obj) {
			if (obj.app.allowsms) {
				if (CONF.totalapi) {
					model.from = CONF.name;
					TotalAPI('sms', model, $.done());
				} else
					$.invalid('@(Invalid Total API token)');
			} else
				$.invalid('error-permissions');
		});
	});

});