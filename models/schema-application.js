NEWSCHEMA('Application').make(function(schema) {

	schema.define('id', 'Url', true);
	schema.define('title', 'String(50)', true);
	schema.define('config', 'String(100)');
	schema.define('secret', 'String(30)');
	schema.define('notifications', Boolean);
	schema.define('users', Boolean);
	schema.define('mobile', Boolean);
	schema.define('applications', Boolean);
	schema.define('serviceworker', Boolean);

	schema.setSave(function(error, model, options, callback) {

		var process = function(err, item, update) {

			if (err) {
				error.push(err);
				return callback();
			}

			item.title = model.title;
			item.notifications = model.notifications;
			item.users = model.users;
			item.config = model.config;
			item.mobile = model.mobile;
			item.secret = model.secret;
			item.applications = model.applications;
			item.serviceworker = model.serviceworker;
			item.search = (model.name + ' ' + model.title).toSearch();
			item.linker = model.title.slug();

			if (!update) {
				item.datecreated = F.datetime;
				APPLICATIONS.push(item);
			}

			// Save all applications into the file
			APPLICATIONS.quicksort('title', true, 10);
			OPENPLATFORM.applications.save();

			// Responds
			callback(SUCCESS(true));
		};

		var item = APPLICATIONS.findItem('internal', OPENPLATFORM.applications.uid(model.id));
		if (item)
			return process(null, item, true);

		OPENPLATFORM.applications.create(model.id, process);
	});

	schema.setRemove(function(error, id, callback) {

		var index = APPLICATIONS.findIndex('internal', id);
		if (index === -1) {
			error.push('error-application-notfound');
			return callback();
		}

		var item = APPLICATIONS[index];
		APPLICATIONS.splice(index, 1);
		OPENPLATFORM.applications.save();

		var save = false;

		// Clears user's profiles
		for (var i = 0, length = USERS.length; i < length; i++) {
			var user = USERS[i];
			if (user.applications[item.internal]) {
				delete user.applications[item.internal];
				delete user.settings[item.internal];
				save = true;
			}

			if (!user.widgets || !user.widgets.length)
				continue;

			var id = item.internal.toString() + 'X';
			user.widgets = user.widgets.remove(n => n.startsWith(id));
			if (!user.widgets.length)
				user.widgets = null;
			save = true;
		}

		if (save)
			OPENPLATFORM.users.save();

		callback(SUCCESS(true));
	});

});