NEWSCHEMA('Service').make(function(schema) {
	schema.define('user', 'String(100)');    // User Token
	schema.define('event', 'String(100)');   // Event name
	schema.define('data', 'Object');         // Custom data (JSON)
});