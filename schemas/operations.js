NEWSCHEMA('UserApps', function(schema) {

	schema.define('type', ['extend', 'set', 'remove'], true);
	schema.define('ou', 'String(200)');
	schema.define('company', 'String(50)');
	schema.define('locality', 'String(50)');
	schema.define('group', 'String(50)');
	schema.define('role', 'String(50)');
	schema.define('gender', ['male', 'female']);
	schema.define('customer', Boolean);
	schema.define('sa', Boolean);
	schema.define('apps', 'Object');

	schema.addWorkflow('exec', function($) {
		if ($.user.sa)
			FUNC.users.assign($.model.$clean(), $.done(true));
		else
			$.invalid('error-permissions');
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