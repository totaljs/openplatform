const Fs = require('fs');

NEWSCHEMA('Notification').make(function(schema) {

	schema.define('type', Number);
	schema.define('body', 'String(1000)', true);
	schema.define('data', 'String(1000)');

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

			EMIT('users.notify', user, '');

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

			user = F.global.users.findItem('id', $.query.user);
			if (!user) {
				$.success();
				return;
			}

			$.model.title = $.user.name;

		} else {

			var obj = $.query.accesstoken ? OP.decodeToken($.query.accesstoken) : null;
			if (!obj) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var ip = $.ip;

			app = obj.app;
			user = obj.user;

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
		}

		var model = $.model.$clean();
		model.iduser = user.id;

		if (app)
			model.idapp = app.id;

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

		can && Fs.appendFile(F.path.databases('notifications_{0}.json'.format(user.id)), JSON.stringify(model) + ',', NOOP);

		if (user.countnotifications)
			user.countnotifications++;
		else
			user.countnotifications = 1;

		user.datenotified = F.datetime;

		OP.saveState(2);
		EMIT('users.notify', user, app ? app.id : '');
		$.success();

		// Stats
		var db = NOSQL('users');
		db.counter.hit('all');
		db.counter.hit(user.id);

		if (app) {
			db = NOSQL('apps');
			db.counter.hit('all');
			db.counter.hit(app.id);
		}
	});

});