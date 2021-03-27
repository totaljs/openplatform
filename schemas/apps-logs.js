NEWSCHEMA('Apps/Logs', function(schema) {

	schema.define('appid', 'UID');
	schema.define('body', 'String(500)', true);
	schema.define('type', ['error', 'info', 'warning', 'success', 'alert'])('info');

	schema.setInsert(function($, model) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		var app = MAIN.apps.findItem('id', model.appid);
		if (!app) {
			$.invalid('error-apps-404');
			return;
		}

		model.type = app.name + '.' + model.type;
		model.message = model.body;
		model.userid = $.user.id;
		model.username = $.user.name;
		model.rowid = model.appid;
		model.ip = $.ip;
		model.ua = $.ua;
		model.dtcreated = NOW;

		delete model.appid;
		delete model.body;

		DBMS().insert('tbl_log', model);
		$.success();
	});

});