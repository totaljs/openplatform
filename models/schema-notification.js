// App notifications
NEWSCHEMA('Notification').make(function(schema) {

	schema.define('type', Number);                 // 0: info, 1: success, 2: alert
	schema.define('body', 'String(5000)', true);   // A Message
	schema.define('url', 'Url');                   // Open URL in application iFrame

	schema.setSave(function(error, model, options, callback, controller) {
		var item = model.$clean();
		if (!item.url)
			item.url = controller.app.url;
		item.datecreated = new Date();
		item.internal = controller.app.internal;
		controller.user.notify(item);
		callback(SUCCESS(true));
	});
});

// Internal admin notifications
NEWSCHEMA('Notify').make(function(schema) {

	schema.define('type', Number);                 // 0: info, 1: success, 1: alert
	schema.define('group', '[String]');            // User's group
	schema.define('department', '[String]');       // User's department
	schema.define('place', '[String]');            // User's place
	schema.define('company', '[String]');          // User's company
	schema.define('body', 'String(5000)', true);   // A message
	schema.define('url', 'Url');                   // URL

	schema.setSave(function(error, model, options, callback) {

		var clean = model.$clean();
		var count = 0;

		clean.datecreated = new Date();
		clean.internal = 0;

		delete clean.group;
		var group = model.group && model.group.length ? model.group : null;
		var department = model.department && model.department.length ? model.department : null;
		var place = model.place && model.place.length ? model.place : null;
		var company = model.company && model.company.length ? model.company : null;

		for (var i = 0, length = USERS.length; i < length; i++) {
			var user = USERS[i];

			if ((group && group.indexOf(user.group) === -1) || (department && department.indexOf(user.department) === -1) || (place && place.indexOf(user.place) === -1) || (company && company.indexOf(user.company) === -1))if (group && group.indexOf(user.group) === -1)
				continue;

			user.notify(clean);
			count++;
		}

		callback(SUCCESS(true, count));
	});
});
