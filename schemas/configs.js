NEWSCHEMA('Config', function(schema) {

	schema.define('body', 'String', true);

	schema.setGet(function($) {
		OP.decodeToken($.query.accesstoken, function(err, obj) {

			if (!obj) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var ip = $.ip;
			var user = obj.user;
			var app = obj.app;

			if (app.origin) {
				if (app.origin.indexOf(ip) == -1 && app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
					$.invalid('error-invalid-origin');
					return;
				}
			} else if (app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
				$.invalid('error-invalid-origin');
				return;
			}

			if (!app.allownotifications) {
				$.invalid('error-permissions');
				return;
			}

			if (!user.notifications || user.blocked || user.inactive) {
				$.invalid('error-accessible');
				return;
			}

			FUNC.configs.get(user.id, app.id, $.callback);
		});
	});

	schema.setSave(function($) {
		OP.decodeToken($.query.accesstoken, function(err, obj) {

			if (!obj) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var ip = $.ip;
			var user = obj.user;
			var app = obj.app;

			if (app.origin) {
				if (app.origin.indexOf(ip) == -1 && app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
					$.invalid('error-invalid-origin');
					return;
				}
			} else if (app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
				$.invalid('error-invalid-origin');
				return;
			}

			if (!app.allownotifications) {
				$.invalid('error-permissions');
				return;
			}

			if (!user.notifications || user.blocked || user.inactive) {
				$.invalid('error-accessible');
				return;
			}

			FUNC.configs.set(user.id, app.id, $.model.body);
			$.success();
		});
	});
});