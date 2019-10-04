NEWSCHEMA('Meta', function(schema) {

	schema.setGet(function($) {
		FUNC.decodetoken($, function(obj) {
			var user = obj.user;
			$.callback(user.directory ? (MAIN.metadirectories[user.directory] || EMPTYOBJECT) : MAIN.meta);
		});
	});

});