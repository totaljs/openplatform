const Fs = require('fs');
const Path = require('path');

NEWSCHEMA('Settings', function(schema) {

	schema.define('name', 'String(100)', true);
	schema.define('url', 'String(500)', true);
	schema.define('verifytoken', 'String(20)');
	schema.define('marketplace', 'String(500)'); // URL
	schema.define('welcome', 'String(500)'); // URL
	schema.define('email', 'Email', true);
	schema.define('colorscheme', 'Lower(7)');
	schema.define('background', 'String(150)');
	schema.define('smtp', 'String(100)');
	schema.define('smtpsettings', 'JSON');
	schema.define('sender', 'Email');
	schema.define('mode', ['dev', 'prod', 'test'])('prod');
	schema.define('defaultappid', 'UID');
	schema.define('guest', Boolean);
	schema.define('language', 'Lower(2)');
	schema.define('dateformat', ['yyyy-MM-dd', 'dd.MM.yyyy', 'MM.dd.yyyy'])('yyyy-MM-dd'); // date format
	schema.define('timeformat', [12, 24])(24); // 12 or 24
	schema.define('numberformat', [1, 2, 3, 4])(1); // 1: "1 000.10", 2: "1 000,10", 3: "100,000.00", 4: "100.000,00"
	schema.define('desktop', [1, 2, 3])(3);
	schema.define('allowstatus', Boolean);
	schema.define('allowdesktop', Boolean);
	schema.define('allowmembers', Boolean);
	schema.define('allownickname', Boolean);
	schema.define('allowclock', Boolean);
	schema.define('allowbackground', Boolean);
	schema.define('allowtheme', Boolean);
	schema.define('allowprofile', Boolean);
	schema.define('allowcreate', String);
	schema.define('allowdesktopfluid', Boolean);
	schema.define('allowsmembers', Boolean);
	schema.define('allowappearance', Boolean);
	schema.define('allownotifications', Boolean);
	schema.define('allowoauth', Boolean);
	schema.define('allowaccesstoken', Boolean);
	schema.define('allowpassword', Boolean);
	schema.define('rebuildaccesstoken', Boolean);
	schema.define('allowrememberopenapps', Boolean);
	schema.define('cookie_expiration', 'String(20)');
	schema.define('maxmembers', Number);
	schema.define('oauthopenplatform', 'URL');
	schema.define('oauthkey', 'String(30)');
	schema.define('oauthsecret', 'String(50)');
	schema.define('totalapi', 'String(100)');

	schema.setRead(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		DBMS().find('cl_config').fields('id,type,value').callback(function(err, response) {

			var model = {};

			// Compare values
			for (var i = 0; i < response.length; i++) {
				var item = response[i];
				var key = item.id;
				var val = item.value;
				switch (item.type) {
					case 'number':
						model[key] = +val;
						break;
					case 'boolean':
						model[key] = val === 'true';
						break;
					case 'object':
						model[key] = val.parseJSON();
						break;
					default:
						model[key] = val;
						break;
				}
			}

			$.callback(model);
		});
	});

	var insert_config = function(doc, param) {
		doc.id = param.id;
		doc.name = param.id;
		doc.type = param.type;
		doc.dtcreated = NOW;
	};

	schema.setSave(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.clean();

		// Removing older background
		if (CONF.background && model.background !== CONF.background) {
			var path = Path.join(FUNC.uploadir('backgrounds'), CONF.background);
			Fs.unlink(path, NOOP);
			TOUCH('/' + path);
		}

		var db = DBMS();

		if (model.rebuildaccesstoken)
			model.accesstoken = GUID(30);
		else
			model.accesstoken = CONF.accesstoken;

		delete model.rebuildaccesstoken;

		if (model.url.endsWith('/'))
			model.url = model.url.substring(0, model.url.length - 1);

		// Compare values
		var keys = Object.keys(model);

		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var val = model[key] + '';
			db.modify('cl_config', { value: val, dtupdated: NOW }, true).where('id', key).insert(insert_config, { id: key, type: typeof(model[key]) });
		}

		EMIT('settings/update');
		db.log($, model);
		db.callback(() => FUNC.reconfigure($.done()));
	});

	schema.addWorkflow('init', function($) {
		FUNC.reconfigure($.done());
	});
});

NEWSCHEMA('Settings/SMTP', function(schema) {

	schema.define('smtp', 'String(100)', true);
	schema.define('smtpsettings', 'JSON');

	schema.addWorkflow('exec', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.model;
		var options = model.smtpsettings.parseJSON();

		Mail.try(model.smtp, options, function(err) {
			if (err) {
				$.error.replace('@', err.toString());
				$.invalid('error-settings-smtp');
			} else
				$.success();
		});
	});
});

NEWSCHEMA('Settings/TotalAPI', function(schema) {

	schema.define('totalapi', 'String(100)', true);

	schema.addWorkflow('exec', function($, model) {
		if ($.controller && FUNC.notadmin($))
			return;
		TotalAPI(model.totalapi, 'check', EMPTYOBJECT, $.callback);
	});
});