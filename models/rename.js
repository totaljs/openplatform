NEWSCHEMA('Rename').make(function(schema) {

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