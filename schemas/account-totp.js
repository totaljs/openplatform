NEWSCHEMA('Account/Totp', function(schema) {

	schema.define('secret', 'String(50)', true);
	schema.define('code', 'String(6)', true);

	schema.addWorkflow('verify', function($) {
		var output = MODULE('totp').totpverify($.model.secret, $.model.code);
		if (output == null)
			$.invalid('error-totp');
		else
			$.callback(output);
	});

	schema.addWorkflow('generate', function($) {
		$.callback(MODULE('totp').generate('OpenPlatform', CONF.name));
	});
});