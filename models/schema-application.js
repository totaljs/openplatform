NEWSCHEMA('Application').make(function(schema) {

	schema.define('openplatform', 'Url', true);
	schema.define('title', 'String(50)', true);
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
			item.mobile = model.mobile;
			item.applications = model.applications;
			item.serviceworker = model.serviceworker;

			if (!update) {
				item.datecreated = F.datetime;
				APPLICATIONS.push(item);
			}

			// Save all applications into the file
			APPLICATIONS.quicksort('title');
			OPENPLATFORM.applications.save();

			// Responds
			callback(SUCCESS(true));
		};

		var item = APPLICATIONS.findItem('id', OPENPLATFORM.applications.uid(model.openplatform));
		if (item)
			return process(null, item, true);

		OPENPLATFORM.applications.create(model.openplatform, process);
	});

});