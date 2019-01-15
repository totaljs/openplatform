NEWSCHEMA('Meta', function(schema) {

	schema.setGet(function($) {
		OP.decodeAuthToken($.query.accesstoken || '', function(err, obj) {

			if (!obj) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var user = obj.user;
			var app = obj.app;
			var ip = $.ip;

			if (app.origin) {
				if (app.origin.indexOf(ip) == -1 && app.hostname !== ip) {
					$.invalid('error-invalid-origin');
					return;
				}
			} else if (app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
				$.invalid('error-invalid-origin');
				return;
			} else if (user.blocked || user.inactive) {
				$.invalid('error-permissions');
				return;
			}

			if (!user.apps[app.id]) {
				$.invalid('error-permissions');
				return;
			}

			if (user.directory)
				$.callback(G.metadirectories[user.directory] || EMPTYOBJECT);
			else
				$.callback(G.meta);
		});
	});

});