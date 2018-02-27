const Fs = require('fs');

NEWSCHEMA('Notification').make(function(schema) {

	schema.define('type', Number);
	schema.define('body', 'String(1000)', true);
	schema.define('url', 'String(1000)');

	schema.setQuery(function($) {

		var user = $.user;

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

		if ($.user && $.user.sa && !$.query.accesstoken) {

			// Super Admin notifications

			var user = F.global.users.findItem('id', $.query.user);
			if (!user) {
				$.success();
				return;
			}

			$.model.title = $.user.name;

		} else {

			var arr = ($.query.accesstoken || '').split('-');

			// 0 - app accesstoken
			// 1 - app id
			// 2 - user accesstoken
			// 3 - user id

			var app = F.global.apps.findItem('accesstoken', arr[0]);
			if (!app || app.id !== arr[1] || !$.user) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var ip = $.ip;
			if (app.origin) {
				if (!app.origin[ip] && app.hostname !== ip && (!$.user || $.user.id !== arr[3])) {
					$.invalid('error-invalid-origin');
					return;
				}
			} else if (app.hostname !== ip) {
				$.invalid('error-invalid-origin');
				return;
			}

			if (!app.allownotifications) {
				$.invalid('error-permissions');
				return;
			}

			var user = F.global.users.findItem('accesstoken', arr[2]);
			if (!user || user.id !== arr[3]) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			if (!user.notifications || user.blocked || user.inactive) {
				$.invalid('error-permissions');
				return;
			}
		}

		var model = $.model.$clean();
		model.iduser = user.id;

		if (app)
			model.idapp = app.id;

		model.datecreated = F.datetime;
		model.ip = $.ip;

		Fs.appendFile(F.path.databases('notifications_' + user.id + '.json'), JSON.stringify(model) + ',', NOOP);

		if (user.countnotifications)
			user.countnotifications++;
		else
			user.countnotifications = 1;

		user.datenotified = F.datetime;

		OP.saveState(2);
		EMIT('users.notify', user);
		$.success();

		// Stats
		var db = NOSQL('users');
		db.counter.hit('all');
		db.counter.hit(user.id);
	});

});