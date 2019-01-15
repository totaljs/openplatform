NEWSCHEMA('Status', function(schema) {

	schema.define('statusid', Number);
	schema.define('status', 'String(70)');

	schema.setSave(function($) {
		FUNC.users.get($.user.id, function(err, user) {
			if (user) {
				user.statusid = $.model.statusid;
				user.status = $.model.status;
				user.dateupdated = NOW;
				FUNC.users.set(user, ['statusid', 'status', 'dateupdated'], function() {
					FUNC.emit('users.update', user.id, 'account');
					FUNC.emit('users.refresh', user.id);
					$.success();
				});
			} else
				$.invalid('error-permissions');
		});
	});

});