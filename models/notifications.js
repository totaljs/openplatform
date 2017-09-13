const Fs = require('fs');

NEWSCHEMA('Notification').make(function(schema) {

	schema.define('type', Number);
	schema.define('body', 'String(1000)', true);
	schema.define('url', 'String(1000)');

	schema.setQuery(function($) {

		var user = $.controller.user;

		if (!user.countnotifications) {
			$.callback(null);
			return;
		}

		var filename = F.path.databases('notifications_' + user.id + '.json');
		Fs.readFile(filename, function(err, data) {

			user.countnotifications = 0;
			OP.saveState(2);

			EMIT('users.notify', user);

			if (err) {
				$.callback(null);
				return;
			}

			var body = data.toString('utf8');
			$.callback('[' + body.substring(0, body.length - 1) + ']');
			Fs.unlink(filename, NOOP);
		});
	});

	schema.setSave(function($) {

		var user, app;

		if ($.controller.user && $.controller.user.sa && !$.controller.query.accesstoken) {

			// Super Admin notifications

			var user = F.global.users.findItem('id', $.controller.query.user);
			if (!user) {
				$.callback(SUCCESS(true));
				return;
			}

			$.model.title = $.controller.user.name;

		} else {

			var arr = ($.controller.query.accesstoken || '').split('-');

			// 0 - app accesstoken
			// 1 - app id
			// 2 - user accesstoken
			// 3 - user id

			var app = F.global.apps.findItem('accesstoken', arr[0]);
			if (!app || app.id !== arr[1] || !$.controller.user) {
				$.error.push('error-invalid-accesstoken');
				$.callback();
				return;
			}

			var ip = $.controller.ip;
			if (app.origin) {
				if (!app.origin[ip] && app.hostname !== ip && (!$.controller.user || $.controller.user.id !== arr[3])) {
					$.error.push('error-invalid-origin');
					$.callback();
					return;
				}
			} else if (app.hostname !== ip) {
				$.error.push('error-invalid-origin');
				$.callback();
				return;
			}

			if (!app.allownotifications) {
				$.error.push('error-permissions');
				$.callback();
				return;
			}

			var user = F.global.users.findItem('accesstoken', arr[2]);
			if (!user || user.id !== arr[3]) {
				$.error.push('error-invalid-accesstoken');
				$.callback();
				return;
			}

			if (!user.notifications || user.blocked || user.inactive) {
				$.error.push('error-permissions');
				$.callback();
				return;
			}
		}

		var model = $.model.$clean();
		model.iduser = user.id;

		if (app)
			model.idapp = app.id;

		model.datecreated = F.datetime;
		model.ip = $.controller.ip;

		Fs.appendFile(F.path.databases('notifications_' + user.id + '.json'), JSON.stringify(model) + ',', NOOP);

		if (user.countnotifications)
			user.countnotifications++;
		else
			user.countnotifications = 1;

		user.datenotified = F.datetime;

		OP.saveState(2);
		EMIT('users.notify', user);
		$.callback(SUCCESS(true));

		// Stats
		var db = NOSQL('users');
		db.counter.hit('all');
		db.counter.hit(user.id);
	});

});