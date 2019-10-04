NEWSCHEMA('Apps/Config', function(schema) {

	schema.define('body', 'String', true);

	schema.setGet(function($) {
		FUNC.decodetoken($, function(obj) {
			DBMS().read('tbl_user_config').where('id', obj.user.id + obj.app.id).fields('body').callback(function(err, response) {
				if (response && response.body)
					$.callback(response.body);
				else
					$.callback(null);
			});
		});
	});

	schema.setSave(function($) {
		FUNC.decodetoken($, function(obj) {
			var id = obj.user.id + obj.app.id;
			DBMS().modify('tbl_user_config', { body: $.model.body, dtupdated: NOW }, true).where('id', id).insert(function(doc) {
				doc.id = id;
				doc.appid = obj.app.id;
				doc.userid = obj.user.id;
				doc.dtupdated = undefined;
				doc.dtcreated = NOW;
			}).callback($.done());
		});
	});
});