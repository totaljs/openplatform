NEWSCHEMA('Reports', function(schema) {

	schema.define('appid', 'UID', true);
	schema.define('type', ['Bug', 'Feature', 'Improvement'], true);
	// schema.define('subject', 'String(100)', true);
	schema.define('ispriority', Boolean);
	schema.define('issolved', Boolean);
	schema.define('body', String);

	schema.setInsert(function($) {
		var model = $.clean();
		model.id = UID();
		model.dtcreated = NOW;
		model.userid = $.user.id;
		model.ip = $.ip;
		model.issolved = false;

		var db = DBMS();

		db.read('tbl_app').fields('email').error('error-apps-404').where('id', model.appid).callback(function(err, response) {
			if (err) {
				$.invalid(err);
				return;
			}

			db.insert('tbl_report', model).callback($.done());

			var app = MAIN.apps.findItem('id', model.appid);

			var builder = [];

			builder.push('<b>Type:</b> ' + model.type);
			builder.push('<b>User:</b> ' + $.user.name);
			builder.push('<b>Email:</b> ' + $.user.email);
			$.user.phone && builder.push('<b>Phone:</b> ' + $.user.phone);
			builder.push('<b>Application:</b> ' + app.name);
			builder.push('');
			builder.push(model.body);

			// Send email
			LOGMAIL(response.email, model.type + ': ' + app.name, builder.join('\n')).reply($.user.email);
		});
	});

});