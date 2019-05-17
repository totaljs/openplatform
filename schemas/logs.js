NEWSCHEMA('Logger', function(schema) {
	schema.define('appid', 'UID');
	schema.define('appurl', 'String(500)');
	schema.define('body', 'String', true);
	schema.define('type', ['error', 'info', 'warning', 'success', 'alert'])('info');
	schema.setInsert(function($) {
		FUNC.log($.user, $.model.appid, $.model.type, $.model.body);
		$.success();
	});
});