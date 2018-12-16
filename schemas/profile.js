NEWSCHEMA('Profile', function(schema) {
	schema.setGet(function($) {
		OP.profile($.user, function(err, data) {
			data && (data.ip = $.ip);
			$.callback(data);
		});
	});
});