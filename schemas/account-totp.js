NEWSCHEMA('Account/Totp', function(schema) {

	schema.define('secret', 'String(50)', true);
	schema.define('code', 'String(6)', true);

	schema.addWorkflow('verify', function($, model) {
		var output = MODULE('totp').totpverify(model.secret, model.code);
		if (output)
			$.callback(output);
		else
			$.invalid('error-totp');
	});

	schema.addWorkflow('generate', function($) {
		$.callback(MODULE('totp').generate('OpenPlatform', CONF.name));
	});

});