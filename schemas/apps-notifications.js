const DB_NOTIFICATION_APP = {};
const DB_NOTIFICATION_USER = {};
const DB_NOTIFICATIONS_RESET = { countnotifications: 0 };
const DB_NOTIFICATIONS_RESET2 = { countnotifications: 0, dtnotified: null };
const DB_NOTIFICATIONS_UNREAD = { unread: false };

NEWSCHEMA('Apps/Notifications', function(schema) {

	schema.define('type', Number);
	schema.define('body', 'String(1000)', true);
	schema.define('data', 'String(1000)');

	schema.setQuery(function($) {

		var db = DBMS();
		db.all('tbl_user_notification').fields('id,appid,type,title,body,data,ip,dtcreated,unread').where('userid', $.user.id).callback($.callback).take(100).sort('dtcreated', true);
		db.mod('tbl_user', DB_NOTIFICATIONS_RESET2).id($.user.id);
		db.mod('tbl_user_app', DB_NOTIFICATIONS_RESET).where('userid', $.user.id);
		db.mod('tbl_user_notification', DB_NOTIFICATIONS_UNREAD).where('userid', $.user.id).where('unread=TRUE');

		var user = $.user;
		user.countnotifications = 0;
		var keys = Object.keys(user.apps);
		for (var i = 0; i < keys.length; i++)
			user.apps[keys[i]].countnotifications = 0;
	});

	schema.setSave(function($, model) {
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

			model.id = UID('notifications');
			model.userid = user.id;
			model.appid = app.id;
			model.dtcreated = new Date();
			model.ip = $.ip;
			model.userappid = user.id + app.id;

			var can = true;
			var ua;

			if (app) {

				if (user.apps[app.id]) {
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
				} else {
					$.invalid('error-accessible');
					return;
				}
			}

			if (user.countnotifications)
				user.countnotifications++;
			else
				user.countnotifications = 1;

			user.dtnotified = NOW;

			if (can) {
				DB_NOTIFICATION_USER.countnotifications = user.countnotifications;
				DB_NOTIFICATION_APP.countnotifications = ua.countnotifications;

				var db = DBMS();
				db.mod('tbl_user', DB_NOTIFICATION_USER).id(user.id);
				db.mod('tbl_user_app', DB_NOTIFICATION_APP).id(user.id + app.id);
				db.ins('tbl_user_notification', model);
				db.callback($.done());

				MAIN.session.update(user.id, function(session) {
					session.apps[app.id].countnotifications = ua.countnotifications;
					session.countnotifications = user.countnotifications;
				});

			} else
				$.success();
		});
	});

	schema.addWorkflow('internal', function($, model) {

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

		model.id = UID('notifications');
		model.userid = user.id;
		model.appid = app.id;
		model.dtcreated = NOW;
		model.ip = $.ip;
		model.userappid = user.id + app.id;

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

			DB_NOTIFICATION_USER.countnotifications = user.countnotifications;
			DB_NOTIFICATION_APP.countnotifications = ua.countnotifications;

			var db = DBMS();
			db.mod('tbl_user', DB_NOTIFICATION_USER).id(user.id);
			db.mod('tbl_user_app', DB_NOTIFICATION_APP).id(user.id + app.id);
			db.ins('tbl_user_notification', model);
			db.callback($.done());

			MAIN.session.update(user.id, function(session) {
				session.apps[app.id].countnotifications = ua.countnotifications;
				session.countnotifications = user.countnotifications;
			});

		} else
			$.success();
	});

	schema.addWorkflow('clear', function($) {
		var db = DBMS();
		db.rem('tbl_user_notification').where('userid', $.user.id);
		db.mod('tbl_user', DB_NOTIFICATIONS_RESET2).id($.user.id);
		db.mod('tbl_user_app', DB_NOTIFICATIONS_RESET).where('userid', $.user.id);
		db.log($);
		MAIN.session.refresh($.user.id, $.sessionid);
		$.success();
	});

});