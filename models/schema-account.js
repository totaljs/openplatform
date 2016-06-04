NEWSCHEMA('Account').make(function(schema) {

	schema.define('sounds', Boolean);
	schema.define('notifications', Boolean);

	schema.setSave(function(error, model, controller, callback) {
		controller.user.sounds = model.sounds;
		controller.user.notifications = model.notifications;
		OPENPLATFORM.users.save();
		callback(SUCCESS(true));
	});
});