NEWSCHEMA('Account').make(function(schema) {

	schema.define('sounds', Boolean);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('ispassword', Boolean);
	schema.define('password', 'String(30)');

	schema.setSave(function(error, model, controller, callback) {

		var user = controller.user;

		user.sounds = model.sounds;
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