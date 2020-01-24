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

			MAIN.session.set2(user.id, user);

			DB_BADGES.countbadges = ua.countbadges;
			DBMS().mod('tbl_user_app', DB_BADGES).where('id', user.id + app.id);
		}

		// Response
		$.success();

	});

	schema.addWorkflow('all', function($) {

		var app = MAIN.apps.findItem('id', $.id || $.options.id);
		if (!app) {
			$.invalid('error-apps-404');
			return;
		}

		var model = {};
		model['+countbadges'] = 1;
		DBMS().mod('tbl_user_app', model).where('appid', app.id);

		MAIN.session.listlive(function(err, items) {

			var update = [];

			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.data.apps && item.data.apps[app.id]) {
					var appdata = item.data.apps[app.id];
					if (appdata.countbadges)
						appdata.countbadges++;
					else
						appdata.countbadges = 1;
					update.push(item);
				}
			}

			update.length && update.wait(function(item, next) {
				MAIN.session.update(item.id, item.data, null, null, null, next);
			});

			$.success(true, update.length);
		});

	});

});