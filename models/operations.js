NEWSCHEMA('UserApps').make(function(schema) {

	schema.define('type', ['extend', 'set', 'remove'], true);
	schema.define('group', 'String(50)');
	schema.define('department', 'String(50)');
	schema.define('place', 'String(50)');
	schema.define('company', 'String(50)');
	schema.define('position', 'String(50)');
	schema.define('gender', ['male', 'female']);
	schema.define('customer', ['true', 'false']);
	schema.define('apps', 'Object');

	schema.addWorkflow('exec', function($) {

		var model = $.model;
		var users = F.global.users;
		var count = 0;
		var keys = Object.keys(model.apps);

		for (var i = 0, length = users.length; i < length; i++) {
			var user = users[i];
			if (model.group && user.group !== model.group)
				continue;
			if (model.department && user.department !== model.department)
				continue;
			if (model.place && user.place !== model.place)
				continue;
			if (model.company && user.company !== model.company)
				continue;
			if (model.position && user.position !== model.position)
				continue;
			if (model.gender && user.gender !== model.gender)
				continue;
			if (model.customer === 'true') {
				if (!user.customer)
					continue;
			} else if (model.customer === 'false') {
				if (user.customer)
					continue;
			}

			if (model.type === 'set') {
				count++;
				user.apps = CLONE(model.apps);
				continue;
			}

			keys.forEach(function(key) {

				var app = model.apps[key];
				var permissions = app.roles;

				// Extends
				if (model.type === 'extend') {
					!user.apps[key] && (user.apps[key] = { roles: [] });
					permissions.forEach(permission => user.apps[key].push(permission));
					user.apps[key].settings = app.settings;
					count++;
					return;
				}

				// Removes
				if (model.type !== 'remove')
					return;

				count++;

				if (permissions.length) {
					permissions.forEach(function(permission) {
						if (users.apps[key])
							user.apps[key].roles = user.apps[key].roles.remove(permission);
					});
				} else
					delete user.apps[key];
			});

		}

		$.callback(SUCCESS(true, count));
	});
});

NEWSCHEMA('UserNotify').make(function(schema) {
	schema.define('type', ['notification', 'email'], true);
	schema.define('subtype', Number);
	schema.define('group', 'String(50)');
	schema.define('department', 'String(50)');
	schema.define('place', 'String(50)');
	schema.define('company', 'String(50)');
	schema.define('position', 'String(50)');
	schema.define('subject', 'String(100)');
	schema.define('gender', ['male', 'female']);
	schema.define('customer', ['true', 'false']);
	schema.define('body', String);

	schema.addWorkflow('exec', function($) {

		var model = $.model;
		var users = F.global.users;
		var count = 0;
		var arr = [];

		for (var i = 0, length = users.length; i < length; i++) {
			var user = users[i];
			if (model.group && user.group !== model.group)
				continue;
			if (model.department && user.department !== model.department)
				continue;
			if (model.place && user.place !== model.place)
				continue;
			if (model.company && user.company !== model.company)
				continue;
			if (model.position && user.position !== model.position)
				continue;
			if (model.gender && user.gender !== model.gender)
				continue;
			if (model.customer === 'true') {
				if (!user.customer)
					continue;
			} else if (model.customer === 'false') {
				if (user.customer)
					continue;
			}
			arr.push(user);
			count++;
		}

		arr.waitFor(function(item, next) {
			var obj = CREATE('Notification');
			obj.body = model.body;
			obj.type = model.subtype;
			$.controller.query.user = item.id;
			obj.$controller($.controller);
			obj.$save(next);
		}, function() {
			$.callback(SUCCESS(true, count));
		});
	});

});

NEWSCHEMA('UserRename').make(function(schema) {

	schema.define('type', ['company', 'group', 'department', 'place', 'position', 'supervisor'], true);
	schema.define('oldname', 'String(50)');
	schema.define('newname', 'String(50)');

	schema.addWorkflow('exec', function($) {

		var model = $.model;
		var users = F.global.users;
		var count = 0;

		for (var i = 0, length = users.length; i < length; i++) {

			var user = users[i];

			switch (model.type) {
				case 'company':
				case 'group':
				case 'department':
				case 'place':
				case 'position':
					if (user[model.type] === model.oldname) {
						user[model.type] = model.newname;
						user[model.type + 'linker'] = model.newname.slug();
						count++;
					}
					break;
				case 'supervisor':
					if (user.idsupervisor === model.oldname) {
						user.idsupervisor = model.newname;
						count++;
					}
					break;
			}

		}

		if (count) {
			$WORKFLOW('User', 'refresh', NOOP);
			OP.saveState(2);
		}

		$.callback(SUCCESS(true, count));
	});

});