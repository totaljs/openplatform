const DB_BADGES = {};

NEWSCHEMA('Apps/Badges', function(schema) {

	schema.addWorkflow('exec', function($) {
		FUNC.decodetoken($, function(obj) {

			var user = obj.user;
			var app = obj.app;

			if (app && user.apps[app.id]) {

				var ua = user.apps[app.id];
				if (ua.countbadges)
					ua.countbadges++;
				else
					ua.countbadges = 1;

				DB_BADGES.countbadges = ua.countbadges;
				DBMS().mod('tbl_user_app', DB_BADGES).id(user.id + app.id);

				MAIN.session.update(user.id, function(session) {
					session.apps[app.id].countbadges = ua.countbadges;
				});

			}

			// Response
			$.success();
		});
	});

	schema.addWorkflow('internal', function($) {

		var user = $.user;
		var app = MAIN.apps.findItem('id', $.id);

		if (!app) {
			$.invalid('error-apps-404');
			return;
		}

		if (app && user.apps[app.id]) {

			var ua = user.apps[app.id];
			if (ua.countbadges)
				ua.countbadges++;
			else
				ua.countbadges = 1;

			DB_BADGES.countbadges = ua.countbadges;
			DBMS().mod('tbl_user_app', DB_BADGES).id(user.id + app.id);

			MAIN.session.update(user.id, function(session) {
				session.apps[app.id].countbadges = ua.countbadges;
			});
		}

		// Response
		$.success();

	});

});