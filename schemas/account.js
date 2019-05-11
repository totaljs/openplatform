var DDOS = {};

NEWSCHEMA('Account', function(schema) {

	schema.define('email', 'Email', true);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('password', 'String(30)');
	schema.define('phone', 'Phone');
	schema.define('photo', 'String(50)');
	schema.define('sounds', Boolean);
	schema.define('darkmode', Boolean);
	schema.define('dateformat', ['yyyy-MM-dd', 'dd.MM.yyyy', 'MM.dd.yyyy']); // date format
	schema.define('timeformat', [12, 24]); // 12 or 24
	schema.define('numberformat', [1, 2, 3, 4]); // 1: "1 000.10", 2: "1 000,10", 3: "100,000.00", 4: "100.000,00"
	schema.define('volume', Number);
	schema.define('language', 'Lower(2)');
	schema.define('pin', 'String(4)'); // Unlock pin
	schema.define('locking', Number); // in minutes (0: disabled)
	schema.define('colorscheme', 'Lower(7)');
	schema.define('background', 'String(150)');

	schema.setGet(function($) {
		FUNC.users.get($.user.id, function(err, user) {
			var data = {};
			if (user) {
				data.email = user.email;
				data.notifications = user.notifications;
				data.notificationsemail = user.notificationsemail;
				data.notificationsphone = user.notificationsphone;
				data.phone = user.phone;
				data.photo = user.photo;
				data.darkmode = user.darkmode;
				data.sounds = user.sounds;
				data.volume = user.volume;
				data.language = user.language;
				data.colorscheme = user.colorscheme;
				data.background = user.background;
				data.locking = user.locking;
				data.dateformat = user.dateformat;
				data.timeformat = user.timeformat;
				data.numberformat = user.numberformat;
			}
			$.callback(data);
		});
	});

	schema.setSave(function($) {

		var model = $.clean();

		FUNC.users.get($.user.id, function(err, user) {
			if (user) {

				// Removing older background
				if (user.background && model.background !== user.background)
					FUNC.files.removebackground(user.background);

				// Removing older photo
				if (user.photo && model.photo !== user.photo)
					FUNC.files.removebackground(user.photo);

				if (model.password && !model.password.startsWith('***')) {
					user.password = model.password.sha256();
					user.dtpassword = NOW;
					model.dtpassword = NOW;
				}

				var modified = false;

				if (user.email !== model.email) {
					user.email = model.email;
					modified = true;
				}

				user.notifications = model.notifications;
				user.notificationsemail = model.notificationsemail;
				user.notificationsphone = model.notificationsphone;

				if (user.phone !== model.phone) {
					user.phone = model.phone;
					modified = true;
				}

				user.darkmode = model.darkmode;

				if (user.photo !== model.photo) {
					user.photo = model.photo;
					modified = true;
				}

				if (user.language !== model.language) {
					user.language = model.language;
					modified = true;
				}

				user.sounds = model.sounds;
				user.volume = model.volume;
				user.colorscheme = model.colorscheme;
				user.background = model.background;
				user.dtupdated = NOW;
				user.locking = model.locking;

				var tmp = model.dateformat || 'yyyy-MM-dd';

				if (user.dateformat !== tmp) {
					user.dateformat = tmp;
					modified = true;
				}

				tmp = model.timeformat || 24;
				if (user.timeformat !== tmp) {
					user.timeformat = model.timeformat;
					modified = true;
				}

				tmp = model.numberformat || 1;

				if (user.numberformat !== tmp) {
					user.numberformat = model.numberformat;
					modified = true;
				}

				var keys = Object.keys(model);

				if (modified) {
					user.dtmodified = NOW;
					keys.push('dtmodified');
				}

				if (model.pin && model.pin.length === 4 && model.pin && model.pin != '0000')
					user.pin = model.pin.sha256().hash() + '';

				FUNC.users.set(user, keys, function() {
					FUNC.emit('users.update', user.id, 'account');
					FUNC.emit('users.refresh', user.id);
					$.success();
				});

			} else
				$.invalid('error-users-404');
		});
	});

	schema.addWorkflow('unlock', function($) {

		if (!$.user) {
			$.invalid('error-offline');
			return;
		}

		if (!$.controller.req.locked) {
			$.success();
			return;
		}

		var pin = $.query.pin || '0000';
		var id = $.user.id;

		if (DDOS[id])
			DDOS[id]++;
		else
			DDOS[id] = 1;

		if (DDOS[id] > 7) {
			OP.logout($.controller);
			return;
		}

		var pin = pin.sha256().hash() + '';
		if ($.user.pin !== pin) {
			$.invalid('error-pin');
			return;
		}

		OP.session.get($.sessionid, function(err, profile, meta) {
			meta.settings = (meta.settings || '').replace('locked:1', 'locked:0');
			OP.session.set($.sessionid, profile.id, profile, CONF.cookie_expiration || '1 month', meta.note, meta.settings, $.done());
			delete DDOS[id];
		});
	});
});

ON('service', function(counter) {
	if (counter % 60 === 0)
		DDOS = {};
});