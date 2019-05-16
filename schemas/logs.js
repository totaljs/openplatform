NEWSCHEMA('Logger', function(schema) {
	schema.define('appid', 'UID');
	schema.define('appurl', 'String(500)');
	schema.define('body', 'String', true);
	schema.setInsert(function($) {
		FUNC.log($.user, $.model.appid, 0, $.model.body);
		$.success();
	});
});