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

			if (app && user.apps[app.id]) {
				var ua = user.apps[app.id];
				if (ua.countbadges)
					ua.countbadges++;
				else
					ua.countbadges = 1;

				// Badges are part of the profile
				// They don't need own DB

				// Updates profile
				FUNC.users.set(user, ['countnotifications', 'apps'], () => FUNC.emit('users.badge', user.id, app.id), app);

				// Updates sessions
				FUNC.sessions.set(user.id, user, '10 minutes');
			}

			// Response
			$.success();
		});
	});
});