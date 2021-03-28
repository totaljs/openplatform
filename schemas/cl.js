NEWSCHEMA('Codelist', function(schema) {

	schema.encrypt();
	schema.compress();

	schema.setQuery(function($) {
		var obj = {};
		obj.numberformats = [{ id: 1, name: '100 000.123' }, { id: 2, name: '100 000,123' }, { id: 3, name: '100.100,123' }, { id: 4, name: '100,100.123' }];
		obj.dateformats = [{ id: 'yyyy-MM-dd', name: TRANSLATE($.user.language, 'year-month-day') }, { id: 'dd.MM.yyyy', name: TRANSLATE($.user.language, 'day.month.year') }, { id: 'MM.dd.yyyy', name: TRANSLATE($.user.language, 'month.day.year') }];
		obj.timeformats = [{ id: 24, name: TRANSLATE($.user.language, '24 hour clock') }, { id: 12, name: TRANSLATE($.user.language, '12 hour clock') }];
		var db = DBMS();
		db.output(obj);
		db.find('cl_language').fields('id,name').where('active=TRUE').set('languages');
		db.callback($.callback);
	});

	schema.addWorkflow('meta', function($) {
		if ($.user.directory) {
			var obj = MAIN.metadirectories[$.user.directory];
			$.callback(obj ? obj : EMPTYOBJECT);
		} else
			$.callback(MAIN.meta);
	});

	// Unused
	schema.addWorkflow('marketplace', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var data = {};
		data.id = MAIN.id;
		data.url = CONF.url;

		if ($.user.darkmode)
			data.darkmode = '1';

		var db = DBMS();
		db.query('SELECT COUNT(1)::int4 AS count FROM tbl_user').first();
		db.callback(function(err, response) {
			data.users = response.count;
			$.callback(data);
		});
	});

});