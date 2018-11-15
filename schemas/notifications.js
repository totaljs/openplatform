NEWSCHEMA('Notification', function(schema) {

	schema.define('type', Number);
	schema.define('body', 'String(1000)', true);
	schema.define('data', 'String(1000)');

	schema.setQuery(function($) {

		var user = $.user;

		if (!user.countnotifications) {
			$.callback(null);
			return;
		}

		FUNC.notifications.get(user.id, function(err, data) {
			// Remove notifications
			FUNC.notifications.rem(user.id, function() {

				// Notifies all clients
				FUNC.emit('users.notify', user.id, '', true);

				// Update session
				FUNC.sessions.get(user.id, function(err, session) {
					if (session) {
						session.countnotifications = 0;
						var keys = Object.keys(session.apps);
						for (var i = 0; i < keys.length; i++)
							session.apps[keys[i]].countnotifications = 0;
						FUNC.sessions.set(user.id, session);
					}
				});
			});

			// Returns notifications data
			$.callback(data);
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
				if (!app.origin[ip] && app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
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

			var model = $.model.$clean();
			model.userid = user.id;
			model.appid = app.id;
			model.datecreated = F.datetime;
			model.ip = $.ip;

			var can = true;

			if (app && user.apps[app.id]) {
				var ua = user.apps[app.id];
				if (ua.countnotifications)
					ua.countnotifications++;
				else
					ua.countnotifications = 1;
				if (ua.countnotifications > 15)
					can = false;
			}

			if (user.countnotifications)
				user.countnotifications++;
			else
				user.countnotifications = 1;

			user.datenotified = F.datetime;

			if (can) {
				FUNC.notifications.add(model);
				FUNC.users.set(user, ['countnotifications', 'apps', 'datenotified'], () => FUNC.emit('users.notify', user.id, app.id));
				FUNC.sessions.set(user.id, user, '10 minutes');
			}

			$.success();

			var db;

			// Stats
			db = NOSQL('users');
			db.counter.hit('all');
			db.counter.hit(user.id);

			db = NOSQL('apps');
			db.counter.hit('all');
			db.counter.hit(app.id);
		});
	});
});