NEWSCHEMA('Badge', function(schema) {
	schema.addWorkflow('exec', function($) {
		OP.decodeToken($.query.accesstoken, function(err, obj) {

			if (!obj) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var user = obj.user;
			var app = obj.app;
			var ip = $.ip;

			if (app.origin) {
				if (!app.origin[ip] && app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
					$.invalid('error-invalid-origin');
					return;
				}
			} else if (app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
				$.invalid('error-invalid-origin');
				return;
			}

			if (user.blocked || user.inactive) {
				$.invalid('error-accessible');
				return;
			}

			if (user.apps[app.id]) {
				var ua = user.apps[app.id];

				if (ua.countbadges)
					ua.countbadges++;
				else
					ua.countbadges = 1;

				FUNC.users.set(user, ['apps']);
				FUNC.emit('users.badge', user.id, app.id);
				$.success();
			} else
				$.invalid('error-permissions');
		});
	});
});