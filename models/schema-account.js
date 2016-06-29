NEWSCHEMA('Account').make(function(schema) {

	schema.define('sounds', Boolean);
	schema.define('volume', Number);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('ispassword', Boolean);
	schema.define('password', 'String(30)');

	schema.setSave(function(error, model, controller, callback) {

		var user = controller.user;

		user.sounds = model.sounds;
		user.volume = model.volume;

		if (user.volume < 0) {
			user.volume = 0;
			user.sounds = false;
		} else if (user.volume > 100)
			user.volume = 100;

		user.notifications = model.notifications;
		user.notificationsemail = model.notificationsemail;

		if (model.ispassword && model.password) {
			user.password = model.password.hash('sha256');
			user.datepassword = F.datetime;
		}

		OPENPLATFORM.users.save();
		callback(SUCCESS(true));
	});
});