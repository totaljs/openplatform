const DB_NOTIFICATION_APP = {};
const DB_NOTIFICATION_USER = {};
const DB_NOTIFICATIONS_RESET = { countnotifications: 0 };
const DB_NOTIFICATIONS_UNREAD = { unread: false };

NEWSCHEMA('Apps/Notifications', function(schema) {

	schema.define('type', Number);
	schema.define('body', 'String(1000)', true);
	schema.define('data', 'String(1000)');

	schema.setQuery(function($) {

		var db = DBMS();
		db.all('tbl_user_notification').where('userid', $.user.id).callback($.callback).take(100).sort('dtcreated', true);
		db.mod('tbl_user', DB_NOTIFICATIONS_RESET).where('id', $.user.id);
		db.mod('tbl_user_app', DB_NOTIFICATIONS_RESET).where('userid', $.user.id);
		db.mod('tbl_user_notification', DB_NOTIFICATIONS_UNREAD).where('userid', $.user.id).where('unread', true);

		var user = $.user;
		user.countnotifications = 0;
		var keys = Object.keys(user.apps);
		for (var i = 0; i < keys.length; i++)
			user.apps[keys[i]].countnotifications = 0;

		MAIN.session.set2(user.id, user);
	});

	schema.setSave(function($) {
		FUNC.decodetoken($, function(obj) {

			var user = obj.user;
			var app = obj.app;

			if (!app.allownotifications) {
				$.invalid('error-permissions');
				return;
			}

			if (!user.notifications) {
				$.invalid('error-accessible');
				return;
			}

			var model = $.clean();
			model.id = UID('notifications');
			model.userid = user.id;
			model.appid = app.id;
			model.dtcreated = NOW;
			model.ip = $.ip;
			model.userappid = user.id + app.id;

			if (user.online) {
				if (MAIN.notifications[model.userid])
					MAIN.notifications[model.userid].push(model);
				else
					MAIN.notifications[model.userid] = [model];
			}

			var can = true;
			var ua;

			if (app && user.apps[app.id]) {

				ua = user.apps[app.id];

				if (ua.notifications === false) {
					$.invalid('error-notifications-muted');
					return;
				}

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

			user.dtnotified = NOW;

			if (can) {

				// Updates session
				MAIN.session.set2(user.id, user);

				DB_NOTIFICATION_USER.dtnotified = NOW;
				DB_NOTIFICATION_USER.countnotifications = user.countnotifications;
				DB_NOTIFICATION_APP.countnotifications = ua.countnotifications;

				var db = DBMS();
				db.mod('tbl_user', DB_NOTIFICATION_USER).where('id', user.id);
				db.mod('tbl_user_app', DB_NOTIFICATION_APP).where('id', user.id + app.id);
				db.add('tbl_user_notification', model);
				db.callback($.done());
			} else
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

		if (!app.allownotifications) {
			$.invalid('error-permissions');
			return;
		}

		if (!user.notifications) {
			$.invalid('error-accessible');
			return;
		}

		var model = $.clean();
		model.id = UID('notifications');
		model.userid = user.id;
		model.appid = app.id;
		model.dtcreated = NOW;
		model.ip = $.ip;
		model.userappid = user.id + app.id;

		if (user.online) {
			if (MAIN.notifications[model.userid])
				MAIN.notifications[model.userid].push(model);
			else
				MAIN.notifications[model.userid] = [model];
		}

		var can = true;
		var ua;

		if (app && user.apps[app.id]) {

			ua = user.apps[app.id];

			if (ua.notifications === false) {
				$.invalid('error-notifications-muted');
				return;
			}

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

		user.dtnotified = NOW;

		if (can) {

			// Updates session
			MAIN.session.set2(user.id, user);

			DB_NOTIFICATION_USER.dtnotified = NOW;
			DB_NOTIFICATION_USER.countnotifications = user.countnotifications;
			DB_NOTIFICATION_APP.countnotifications = ua.countnotifications;

			var db = DBMS();
			db.mod('tbl_user', DB_NOTIFICATION_USER).where('id', user.id);
			db.mod('tbl_user_app', DB_NOTIFICATION_APP).where('id', user.id + app.id);
			db.add('tbl_user_notification', model);
			db.callback($.done());
		} else
			$.success();
	});
});