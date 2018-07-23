NEWSCHEMA('User').make(function(schema) {

	schema.define('email', 'Email', true);
	schema.define('phone', 'Phone', true);
	schema.define('photo', 'String(30)');
	schema.define('login', 'String(30)');
	schema.define('password', 'String(30)');
	schema.define('notifications', Boolean);
	schema.define('sounds', Boolean);

	schema.setSave(function($) {

		var model = $.model;
		var user = F.global.users.findItem('id', $.controller.user.id);

		if (user) {
			user.photo = model.photo;
			user.login = model.login;

			if (model.password && !model.password.startsWith('***'))
				user.password = model.password.sha256();

			user.notifications = model.notifications;
			user.sounds = model.sounds;
			OP.saveState(2);
		}

		$.success();
	});

});