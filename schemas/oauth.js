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
		DBMS().insert('tbl_oauth', model).callback($.done(model.id));
		FUNC.log('oauth/create', model.id, model.name, $);
	});

	schema.setUpdate(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		model.dtupdated = NOW;

		if (model.rebuild)
			model.accesstoken = GUID(35);

		delete model.rebuild;
		DBMS().modify('tbl_oauth', model).id($.id).callback($.done($.id));
		FUNC.log('oauth/update', $.id, model.name, $);
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		DBMS().remove('tbl_oauth').id($.id).callback($.done($.id));
		FUNC.log('oauth/remove', $.id, '', $);
	});

});