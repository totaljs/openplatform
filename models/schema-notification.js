NEWSCHEMA('Notification').make(function(schema) {
	schema.define('reference', 'String(100)');  // A custom reference
	schema.define('type', Number);              // 0: info, 1: success, 1: alert
	schema.define('user', 'String(100)');       // User Token
	schema.define('body', 'String(1000)');      // Message
});