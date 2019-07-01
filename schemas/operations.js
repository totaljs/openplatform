NEWSCHEMA('UserApps', function(schema) {

	schema.define('ou', 'String(200)');
	schema.define('company', 'String(40)');
	schema.define('locality', 'String(40)');
	schema.define('position', 'String(40)');
	schema.define('group', 'String(50)');
	schema.define('role', 'String(50)');
	schema.define('language', 'Lower(2)');
	schema.define('gender', ['male', 'female']);
	schema.define('customer', Boolean);
	schema.define('sa', Boolean);
	schema.define('appid', 'UID');
	schema.define('roles', '[String(50)]');

	schema.addWorkflow('exec', function($) {
		if ($.user.sa)
			FUNC.users.assign($.clean(), $.done(true));
		else
			$.invalid('error-permissions');
	});

});