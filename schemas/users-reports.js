NEWSCHEMA('Users/Reports', function(schema) {

	schema.define('appid', 'UID', true);
	schema.define('type', ['Bug', 'Feature', 'Improvement'], true);
	schema.define('screenshot', String);
	schema.define('priority', Boolean);
	schema.define('body', String);

	schema.setQuery(function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().list('tbl_user_report').autofill($, 'id:UID,solved:Boolean,dtcreated:Date,dtsolved:Date,ip:String,username:String,useremail:String,userphoto:String,userposition:String,appname:String,appicon:String,screenshot:Number', '', 'dtcreated_desc', 100).callback($.callback);
	});

	schema.setInsert(function($, model) {

		var screenshot = model.screenshot;

		model.id = UID();
		model.dtcreated = NOW;
		model.userid = $.user.id;
		model.ip = $.ip;
		model.solved = false;
		model.screenshot = screenshot ? true : false;
		model.username = $.user.name;
		model.useremail = $.user.email;
		model.userposition = $.user.position;

		var db = DBMS();

		db.read('tbl_app').fields('icon,email,title,name').error('error-apps-404').id(model.appid).callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			model.appname = (response.title || response.name).max(50);
			model.appicon = response.icon;

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
				FILESTORAGE('reports').save(model.id, 'screenshot.jpg', screenshot.base64ToBuffer(), function() {
					var mail = LOGMAIL(app.email, subject, builder.join('\n')).reply($.user.email);
					model.ispriority && mail.high();
					mail.attachmentfs('reports', model.id, 'screenshot.jpg');
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
		db.one('reports').id($.id).fields('username,appname').data(response => db.log($, null, response.username + ' - ' + response.appname));
		db.err(404);
		db.mod('reports', { solved: true, dtsolved: NOW }).id($.id);
		db.callback($.done());
	});

	schema.addWorkflow('screenshot', function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		$.controller.filefs('reports', $.id);
		$.cancel();
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var db = DBMS();
		db.one('tbl_user_report').id($.id).fields('username,appname').data(response => db.log($, null, response.username + ' - ' + response.appname));
		db.err(404);
		db.rem('tbl_user_report').id($.id);
		db.callback($.done());
		FILESTORAGE('reports').remove($.id);
	});

});