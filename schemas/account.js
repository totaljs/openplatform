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
		FUNC.users.get($.user.id, function(err, user) {
			var data = {};
			if (user) {
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
				user.dateupdated = NOW;

				FUNC.users.set(user, Object.keys(model), function() {
					FUNC.emit('users.update', user.id, 'account');
					FUNC.emit('users.refresh', user.id);
					$.success();
				});

			} else
				$.invalid('error-users-404');
		});
	});

});