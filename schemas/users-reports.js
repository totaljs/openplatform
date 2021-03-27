const Fs = require('fs');

NEWSCHEMA('Users/Reports', function(schema) {

	schema.define('appid', 'UID', true);
	schema.define('type', ['Bug', 'Feature', 'Improvement'], true);
	schema.define('screenshot', String);
	schema.define('priority', Boolean);
	schema.define('body', String);

	schema.setQuery(function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().list('view_user_report').autofill($, 'id:UID,solved:Boolean,dtcreated:Date,dtsolved:Date,ip:String,username:String,userphoto:String,userposition:String,appname:String,appicon:String,screenshot:Number', '', 'dtcreated_desc', 100).callback($.callback);
	});

	schema.setInsert(function($, model) {

		var screenshot = model.screenshot;

		model.id = UID();
		model.dtcreated = NOW;
		model.userid = $.user.id;
		model.ip = $.ip;
		model.solved = false;
		model.screenshot = undefined;

		var db = DBMS();

		db.read('tbl_app').fields('email').error('error-apps-404').id(model.appid).callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			if (screenshot)
				model.screenshot = screenshot.base64ToBuffer();

			var app = MAIN.apps.findItem('id', model.appid);

			$.extend && $.extend(model);
			db.insert('tbl_user_report', model).callback($.done());
			db.log($, model, app.name);

			var builder = [];
			var hr = '<div style="margin:15px 0 0;height:5px;border:0;border-top:1px solid #E0E0E0"></div>';

			builder.push('<b>OpenPlatform:</b> ' + CONF.name);
			builder.push('<b>URL:</b> ' + CONF.url);
			builder.push('<b>Application:</b> ' + app.name);
			builder.push('<b>Device:</b> ' + $.req.headers['user-agent'].parseUA() + ' (IP: ' + $.ip + ')');
			builder.push('<b>Date</b> ' + NOW.format('yyyy-MM-dd HH:mm'));
			builder.push('<b>Type:</b> ' + model.type);
			builder.push('<b>Mode:</b> ' + ($.user.desktop === 3 ? 'Desktop mode' : $.user.desktop === 2 ? 'Tabbed mode' : 'Windowed mode'));
			builder.push(hr);
			builder.push('<b>User:</b> ' + $.user.name + ($.user.sa ? ' <em>(sa)</em>' : ''));
			builder.push('<b>Identifier:</b> ' + $.user.id);
			$.user.reference && builder.push('<b>Reference:</b> ' + $.user.reference);
			builder.push('<b>Email:</b> ' + $.user.email);
			$.user.phone && builder.push('<b>Phone:</b> ' + $.user.phone);

			var roles = [];
			var appdata = $.user.apps[app.id];

			if (appdata)
				roles = appdata.roles;

			builder.push('<b>Groups:</b> ' + $.user.groups.join(', '));
			builder.push('<b>Roles:</b> ' + roles.join(', '));
			builder.push(hr);
			builder.push(model.body.encode());

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

	schema.addWorkflow('solved', function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		var db = DBMS();
		db.modify('tbl_user_report', { solved: true, dtsolved: NOW }).id($.id).callback($.done());
		db.log($, null, $.id);
	});

	schema.addWorkflow('screenshot', function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().one('tbl_user_report').id($.id).fields('screenshot').callback(function(err, response) {
			if (response && response.screenshot)
				$.controller.binary(response.screenshot, 'image/jpeg');
			else
				$.controller.throw404();
			$.cancel();
		});
	});

	schema.setRemove(function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		var db = DBMS();
		db.remove('tbl_user_report').id($.id).callback($.done());
		db.log($, null, $.id);
	});

});