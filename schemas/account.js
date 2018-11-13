const Fs = require('fs');

NEWSCHEMA('Account', function(schema) {

	schema.define('email', 'Email', true);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('password', 'String(30)');
	schema.define('phone', 'Phone');
	schema.define('photo', 'String(50)');
	schema.define('sounds', Boolean);
	schema.define('volume', Number);
	schema.define('colorscheme', 'Lower(7)');
	schema.define('background', 'String(150)');

	schema.setGet(function($) {
		var user = $.controller.user;
		var data = {};
		data.email = user.email;
		data.notifications = user.notifications;
		data.notificationsemail = user.notificationsemail;
		data.notificationsphone = user.notificationsphone;
		data.phone = user.phone;
		data.photo = user.photo;
		data.sounds = user.sounds;
		data.volume = user.volume;
		data.colorscheme = user.colorscheme;
		data.background = user.background;
		data.password = '*********';
		$.callback(data);
	});

	schema.setSave(function($) {

		var user = $.controller.user;
		var model = $.model;
		var path;

		// Removing older background
		if (user.background && model.background !== user.background) {
			path = 'backgrounds/' + user.background;
			Fs.unlink(F.path.public(path), NOOP);
			F.touch('/' + path);
		}

		// Removing older photo
		if (user.photo && model.photo !== user.photo) {
			path = 'photos/' + user.photo;
			Fs.unlink(F.path.public(path), NOOP);
			F.touch('/' + path);
		}

		if (model.password && !model.password.startsWith('***'))
			user.password = model.password.sha256();

		user.email = model.email;
		user.notifications = model.notifications;
		user.notificationsemail = model.notificationsemail;
		user.notificationsphone = model.notificationsphone;
		user.phone = model.phone;
		user.photo = model.photo;
		user.sounds = model.sounds;
		user.volume = model.volume;
		user.colorscheme = model.colorscheme;
		user.background = model.background;

		EMIT('users.update', user, 'account');
		EMIT('users.refresh', user);
		OP.saveState(2);
		$.success();
	});

});