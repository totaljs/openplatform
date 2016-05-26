NEWSCHEMA('User').make(function(schema) {

	schema.define('alias', 'String(60)');
	schema.define('firstname', 'Capitalize(40)', true);
	schema.define('lastname', 'Capitalize(40)', true);
	schema.define('group', 'String(100)');
	schema.define('roles', '[String(50)]');
	schema.define('picture', 'String(30)');
	schema.define('reference', 'String(50)');
	schema.define('phone', 'Phone');
	schema.define('email', 'Email', true);
	schema.define('login', 'String(200)', true);
	schema.define('password', 'String(50)', true);

});