NEWSCHEMA('UserApps').make(function(schema) {

	schema.define('type', ['extend', 'set', 'remove'], true);
	schema.define('ou', 'String(200)');
	schema.define('company', 'String(50)');
	schema.define('locality', 'String(50)');
	schema.define('gender', ['male', 'female']);
	schema.define('customer', ['true', 'false']);
	schema.define('apps', 'Object');

	schema.addWorkflow('exec', function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.model;
		var users = F.global.users;
		var count = 0;
		var keys = Object.keys(model.apps);
		var updated = [];
		var ou = model.ou ? OP.ou(model.ou) : null;

		for (var i = 0, length = users.length; i < length; i++) {
			var user = users[i];
			if (ou && (!user.ougroups || !user.ougroups[ou]))
				continue;
			if (model.company && user.company !== model.company)
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
				updated.push(user);
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
					updated.push(user);
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
				} else {
					delete user.apps[key];
					updated.push(user);
				}
			});
		}

		$.success(true, count);

		updated.wait(function(id, next) {
			EMIT('users.refresh', id);
			setImmediate(next);
		});

	});
});

NEWSCHEMA('UserNotify').make(function(schema) {

	schema.define('type', ['notification', 'email'], true);
	schema.define('subtype', Number);
	schema.define('ou', 'String(200)');
	schema.define('locality', 'String(50)');
	schema.define('company', 'String(50)');
	schema.define('subject', 'String(100)');
	schema.define('gender', ['male', 'female']);
	schema.define('customer', ['true', 'false']);
	schema.define('body', String);

	schema.addWorkflow('exec', function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.model;
		var users = F.global.users;
		var count = 0;
		var arr = [];
		var ou = model.ou ? OP.ou(model.ou) : null;

		for (var i = 0, length = users.length; i < length; i++) {
			var user = users[i];
			if (ou && (!user.ougroups || !user.ougroups[ou]))
				continue;
			if (model.locality && user.locality !== model.locality)
				continue;
			if (model.company && user.company !== model.company)
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

		arr.wait(function(item, next) {
			var obj = CREATE('Notification');
			obj.body = model.body;
			obj.type = model.subtype;
			$.query.user = item.id;
			obj.$controller($.controller);
			obj.$save(next);
		}, () => $.success(true, count));
	});

});

NEWSCHEMA('UserRename').make(function(schema) {

	schema.define('type', ['company', 'ou', 'locality', 'supervisor'], true);
	schema.define('oldname', 'String(50)');
	schema.define('newname', 'String(50)');

	schema.addWorkflow('exec', function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.model;
		var users = F.global.users;
		var count = 0;

		if (model.type === 'ou') {
			model.oldname = OP.ou(model.oldname);
			model.newname = OP.ou(model.newname);
		}

		for (var i = 0, length = users.length; i < length; i++) {

			var user = users[i];

			switch (model.type) {
				case 'company':
				case 'locality':
					if (user[model.type] === model.oldname) {
						user[model.type] = model.newname;
						user[model.type + 'linker'] = model.newname.slug();
						count++;
					}
					break;
				case 'ou':
					if (user.ou === model.oldname) {
						user.ougroups = {};
						user.ou = model.newname;
						var ou = user.ou.split('/').trim();
						var oupath = '';
						for (var i = 0; i < ou.length; i++) {
							oupath += (oupath ? '/' : '') + ou[i];
							user.ougroups[oupath] = true;
						}
						count++;
					}
					break;
				case 'supervisor':
					if (user.supervisorid === model.oldname) {
						user.supervisorid = model.newname;
						count++;
					}
					break;
			}

		}

		if (count) {
			$WORKFLOW('User', 'refresh', NOOP);
			OP.saveState(2);
		}

		$.success(true, count);
	});

});