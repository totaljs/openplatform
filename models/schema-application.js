NEWSCHEMA('Application').make(function(schema) {

	schema.define('url', 'Url', true);
	schema.define('notifications', Boolean);
	schema.define('serviceworker', Boolean);
	schema.define('headers', '[String]');
	schema.define('cookies', '[String]');

	schema.setSave(function(error, model, options, callback) {

		var isUpdated = false;

	});

});