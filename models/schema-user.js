NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'String(50)');
	schema.define('alias', 'String(50)', true);
	schema.define('firstname', 'Capitalize(50)', true);
	schema.define('lastname', 'Capitalize(50)', true);
	schema.define('email', 'Email', true);
	schema.define('login', 'String(50)', true);
	schema.define('password', 'String(50)', true);
	schema.define('roles', '[String]');
	schema.define('picture', 'String(100)', true);
	schema.define('applications', '[String]');

	schema.setSave(function(error, model, options, callback) {

		var isUpdated = false;

	});

});