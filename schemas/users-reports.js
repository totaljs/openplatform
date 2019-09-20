const Fs = require('fs');

NEWSCHEMA('Users/Reports', function(schema) {

	schema.define('appid', 'UID', true);
	schema.define('type', ['Bug', 'Feature', 'Improvement'], true);
	// schema.define('subject', 'String(100)', true);
	schema.define('screenshot', String);
	schema.define('ispriority', Boolean);
	schema.define('issolved', Boolean);
	schema.define('body', String);

	schema.setInsert(function($) {

		var model = $.clean();
		var screenshot = model.screenshot;

		model.id = UID();
		model.dtcreated = NOW;
		model.userid = $.user.id;
		model.ip = $.ip;
		model.issolved = false;
		model.isremoved = false;
		model.screenshot = undefined;

		var db = DBMS();

		db.read('tbl_app').fields('email').error('error-apps-404').where('id', model.appid).callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			db.insert('tbl_user_report', model).callback($.done());

			var app = MAIN.apps.findItem('id', model.appid);

			var builder = [];

			builder.push('<b>OpenPlatform:</b> ' + CONF.name);
			builder.push('<b>Application:</b> ' + app.name);
			builder.push('<b>Device:</b> ' + $.req.headers['user-agent'].parseUA());
			builder.push('<b>Type:</b> ' + model.type);
			builder.push('<b>User:</b> ' + $.user.name);
			builder.push('<b>IP address:</b> ' + $.ip);
			builder.push('<b>Email:</b> ' + $.user.email);
			$.user.phone && builder.push('<b>Phone:</b> ' + $.user.phone);
			builder.push('');
			builder.push(model.body);

			// Send email
			var subject = model.type + ': ' + app.name + ' (' + CONF.name + ')';

			if (screenshot) {
				var filename = PATH.temp('screenshot' + GUID(12) + '.jpg');
				screenshot.base64ToFile(filename, function() {
					var mail = LOGMAIL(response.email, subject, builder.join('\n')).reply($.user.email);
					model.ispriority && mail.high();
					mail.attachment(filename, 'screenshot.jpg');
					mail.callback(() => Fs.unlink(filename, NOOP));
				});
			} else {
				var mail = LOGMAIL(response.email, subject, builder.join('\n')).reply($.user.email);
				model.ispriority && mail.high();
			}
		});
	});

});