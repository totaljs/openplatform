NEWSCHEMA('Apps/Logs', function(schema) {
	schema.define('appid', 'UID');
	schema.define('body', 'String(500)', true);
	schema.define('type', ['error', 'info', 'warning', 'success', 'alert'])('info');
	schema.setInsert(function($) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		$.model.userid = $.user.id;
		DBMS().insert('tbl_user_log', $.model);
		$.success();
	});
});