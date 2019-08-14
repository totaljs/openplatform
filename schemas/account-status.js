NEWSCHEMA('Account/Status', function(schema) {

	schema.define('statusid', Number);
	schema.define('status', 'String(70)');

	schema.setSave(function($) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();
		model.dtmodified = NOW;
		model.dtupdated = NOW;
		$.user.statusid = model.statusid;
		$.user.status = model.status;
		$.user.dtupdated = NOW;
		$.user.dtmodified = NOW;
		DBMS().modify('tbl_user', model).where('id', $.user.id);
		FUNC.log('account/status', $.user.id, model.statusid + ': ' + model.status, $);
		EMIT('account/update', $.user.id);
		MAIN.session.set2($.user.id, $.user);
		$.success();
	});

});