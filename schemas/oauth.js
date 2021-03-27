NEWSCHEMA('OAuth', function(schema) {

	schema.define('name', 'String(40)');
	schema.define('url', 'URL');
	schema.define('icon', 'String(30)');
	schema.define('version', 'String(20)');
	schema.define('allowreadprofile', Number);
	schema.define('allowreadapps', Number);
	schema.define('allowreadusers', Number);
	schema.define('allowreadmeta', Number);
	schema.define('blocked', Boolean);
	schema.define('rebuild', Boolean);

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		DBMS().find('tbl_oauth').sort('dtcreated', true).callback($.callback);
	});

	schema.setInsert(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		model.id = UID();
		model.accesstoken = GUID(35);
		model.dtcreated = NOW;
		delete model.rebuild;
		var db = DBMS();
		db.insert('tbl_oauth', model).callback($.done(model.id));
		db.log($, model, model.name);
	});

	schema.setUpdate(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		model.dtupdated = NOW;

		if (model.rebuild)
			model.accesstoken = GUID(35);

		delete model.rebuild;
		var db = DBMS();
		db.modify('tbl_oauth', model).id($.id).callback($.done($.id));
		db.log($, model, model.name);
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var db = DBMS();
		db.one('tbl_oauth').fields('name').error(404).data(function(response) {
			db.log($, null, response.name);
		});
		db.rem('tbl_oauth').id($.id);
		db.callback($.done($.id));
	});

});