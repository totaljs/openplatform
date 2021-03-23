NEWSCHEMA('Apps/SMS', function(schema) {

	schema.define('to', 'Phone', true);
	schema.define('body', String, true);

	schema.addWorkflow('exec', function($, model) {
		FUNC.decodetoken($, function(obj) {
			if (obj.app.allowsms) {
				if (CONF.totalapi) {
					model.from = CONF.name;
					TotalAPI('sms', model, $.done());
					AUDIT('audit', $, 'SMS/send', obj.app.name);
				} else
					$.invalid('@(Invalid Total API token)');
			} else
				$.invalid('error-permissions');
		});
	});

});