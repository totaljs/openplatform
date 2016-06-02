NEWSCHEMA('Notification').make(function(schema) {
	schema.define('type', Number);              // 0: info, 1: success, 1: alert
	schema.define('user', 'String(100)');       // User Token
	schema.define('body', 'String(1000)');      // Message
	schema.define('url', 'Url');                // Open URL in application iFrame
	schema.define('openplatform', 'Url')        // Application's identificator
});