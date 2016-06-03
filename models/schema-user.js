NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'String(50)');
	schema.define('alias', 'String(50)');
	schema.define('firstname', 'Capitalize(50)', true);
	schema.define('lastname', 'Capitalize(50)', true);
	schema.define('group', 'String(60)');
	schema.define('email', 'Email', true);
	schema.define('phone', 'Phone');
	schema.define('login', 'String(100)', true);
	schema.define('password', 'String(50)', true);
	schema.define('applications', 'Object');
	schema.define('sounds', Boolean);
	schema.define('notifications', Boolean);
	schema.define('blocked', Boolean);
	schema.define('superadmin', Boolean);
	schema.define('welcome', Boolean);

	schema.setSave(function(error, model, options, callback) {

		var user = model.id ? USERS.findItem('id', model.id) : new OPENPLATFORM.User();

		if (!user) {
			error.push('error-invalid-userid');
			return callback();
		}

		user.firstname = model.firstname;
		user.lastname = model.lastname;
		user.email = model.email;
		user.phone = model.phone;
		user.login = model.login;
		user.group = model.group;
		user.search = (user.lastname + ' ' + user.firstname + ' ' + user.group).toSearch();
		user.alias = model.firstname + ' ' + model.lastname;

		if (!model.password.startsWith('****')) {
			user.password = model.password.hash('sha256');
			user.datepassword = F.datetime;
		}

		user.superadmin = model.superadmin;
		user.applications = model.applications;
		user.blocked = model.blocked;
		user.sounds = model.sounds;
		user.notifications = model.notifications;
		user.dateupdated = F.datetime;

		if (user.blocked)
			user.online = false;

		if (!user.id) {
			user.id = UID();
			USERS.push(user);
		}

		OPENPLATFORM.users.save();
		callback(SUCCESS(true));
	});

	schema.setRemove(function(error, id, callback) {

		var index = USERS.findIndex('id', id);
		if (index === -1) {
			error.push('error-user-notfound');
			return callback();
		}

		USERS.splice(index, 1);
		OPENPLATFORM.users.save();
		callback(SUCCESS(true));
	});
});