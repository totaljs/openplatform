NEWSCHEMA('Database', function(schema) {
	schema.define('name', 'String(50)', true);
	schema.define('text', 'String(50)', true);
	schema.define('readers', '[String]');
	schema.define('writers', '[String]');
});

NEWSCHEMA('Database/Field', function(schema) {
	schema.define('name', 'String(50)', true);
	schema.define('text', 'String(50)', true);
	schema.define('type', ['text', 'email', 'phone', 'number', 'decimal', 'url', 'zip', 'date'], true);
	schema.define('readers', '[String]');
	schema.define('writers', '[String]');
	schema.define('required', Boolean);
	schema.define('position', Number);
});

NEWSCHEMA('Database/State', function(schema) {
	schema.define('name', 'String(50)', true);
	schema.define('position', Number);
	schema.define('readers', '[String]');
	schema.define('writers', '[String]');
});