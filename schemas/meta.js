NEWSCHEMA('Meta', function(schema) {

	schema.setGet(function($) {
		FUNC.decodetoken($, function(obj) {
			var user = obj.user;
			$.callback(user.directory ? (MAIN.metadirectories[user.directory] || EMPTYOBJECT) : MAIN.meta);
		});
	});

	// Unused
	schema.addWorkflow('marketplace', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var data = {};
		data.url = CONF.url;

		var db = DBMS();
		db.query('SELECT COUNT(1)::int4 AS count FROM tbl_user').first();
		db.callback(function(err, response) {
			data.users = response.count;
			$.callback(data);
		});
	});

});