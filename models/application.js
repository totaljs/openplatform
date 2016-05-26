NEWSCHEMA('Application').make(function(schema) {

	schema.define('version', 'String(10)');
	schema.define('name', 'String(80)', true);
	schema.define('picture', 'String(500)');
	schema.define('author', 'String(60)');
	schema.define('description', 'String(500)');
	schema.define('email', 'Email', true);
	schema.define('roles', '[String(50)]', true);

});