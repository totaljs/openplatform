NEWSCHEMA('Apps/Config', function(schema) {

	schema.define('body', String);

	schema.setRead(function($) {
		DBMS().read('tbl_user_config').id($.user.id + $.id).fields('body').callback(function(err, response) {
			if (response && response.body)
				$.callback(response.body);
			else
				$.callback(null);
		});
	});

	schema.setSave(function($, model) {
		var id = $.user.id + $.id;
		DBMS().modify('tbl_user_config', { body: model.body, dtupdated: NOW }, true).id(id).insert(function(doc) {
			doc.id = id;
			doc.appid = $.id;
			doc.userid = $.user.id;
			doc.dtupdated = undefined;
			doc.dtcreated = NOW;
		}).callback($.done());
	});
});