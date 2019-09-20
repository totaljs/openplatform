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

				MAIN.session.set2(user.id, user);

				DB_BADGES.countbadges = ua.countbadges;
				DBMS().mod('tbl_user_app', DB_BADGES).where('id', user.id + app.id);
			}

			// Response
			$.success();
		});
	});
});