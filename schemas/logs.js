NEWSCHEMA('Logger', function(schema) {
	schema.define('appid', 'UID');
	schema.define('appurl', 'String(500)');
	schema.define('body', 'String', true);
	schema.setInsert(function($) {
		FUNC.logger('logs', '[{0}]'.format($.user.id + ' ' + $.user.name), '({1} {0})'.format($.model.appurl, $.model.appid), $.model.body);
		$.success();
	});
});