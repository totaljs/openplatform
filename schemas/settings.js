const Fs = require('fs');

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
	schema.define('test', Boolean);
	schema.define('defaultappid', 'UID');
	schema.define('guest', Boolean);
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
	schema.define('rebuildaccesstoken', Boolean);
	schema.define('cookie_expiration', 'String(20)');
	schema.define('maxmembers', Number);

	schema.setGet(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		DBMS().one('tbl_settings').where('id', 'openplatform').callback(function(err, response) {
			response = response.body;
			var model = $.clean();
			var options = response.smtpsettings;
			model.url = response.url;
			model.colorscheme = response.colorscheme;
			model.background = response.background;
			model.email = response.email;
			model.smtp = response.smtp;
			model.smtpsettings = typeof(options) === 'string' ? options : JSON.stringify(options);
			model.sender = response.sender;
			model.test = response.test;
			model.name = response.name;
			model.verifytoken = response.verifytoken;
			model.marketplace = response.marketplace;
			model.welcome = response.welcome;
			model.guest = response.guest;
			model.allownotifications = response.allownotifications == true;
			model.defaultappid = response.defaultappid;
			model.allowmembers = response.allowmembers == true;
			model.allowappearance = response.allowappearance != false;
			model.allowcreate = response.allowcreate;
			model.allowstatus = response.allowstatus != false;
			model.allowclock = response.allowclock != false;
			model.allowdesktop = response.allowdesktop != false;
			model.allowbackground = response.allowbackground != false;
			model.allowtheme = response.allowtheme != false;
			model.allowprofile = response.allowprofile != false;
			model.allownickname = response.allownickname == true;
			model.allowdesktopfluid = response.allowdesktopfluid != false;
			model.cookie_expiration = response.cookie_expiration || '3 days';
			model.maxmembers = response.maxmembers || 0;
			MAIN.id = response.url.crc32(true);
			$.callback(model);
		});
	});

	schema.setSave(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.clean();

		// Removing older background
		if (CONF.background && model.background !== CONF.background) {
			var path = 'backgrounds/' + CONF.background;
			Fs.unlink(PATH.public(path), NOOP);
			F.touch('/' + path);
		}

		CONF.name = model.name;
		CONF.url = model.url;
		CONF.email = model.email;
		CONF.colorscheme = model.colorscheme;
		CONF.background = model.background;
		CONF.mail_smtp = model.smtp;
		CONF.mail_smtp_options = model.smtpsettings.parseJSON();
		CONF.mail_address_from = model.sender;

		if (model.rebuildaccesstoken)
			CONF.accesstoken = model.accesstoken = GUID(30);
		else
			model.accesstoken = CONF.accesstoken;

		delete model.rebuildaccesstoken;

		CONF.test = model.test;
		CONF.verifytoken = model.verifytoken;
		CONF.marketplace = model.marketplace;
		CONF.welcome = model.welcome;
		CONF.guest = model.guest;
		CONF.allowstatus = model.allowstatus != false;
		CONF.allowclock = model.allowclock != false;
		CONF.allowdesktop = model.allowdesktop != false;
		CONF.allownickname = model.allownickname == true;
		CONF.allowmembers = model.allowmembers == true;
		CONF.allowappearance = model.allowappearance != false;
		CONF.allowcreate = model.allowcreate;
		CONF.allownotifications = model.allownotifications == true;
		CONF.cookie_expiration = model.cookie_expiration || '3 days';
		CONF.allowbackground = model.allowbackground != false;
		CONF.allowtheme = model.allowtheme != false;
		CONF.allowprofile = model.allowprofile != false;
		CONF.allowdesktopfluid = model.allowdesktopfluid != false;
		CONF.defaultappid = model.defaultappid;
		CONF.maxmembers = model.maxmembers;

		MAIN.id = CONF.url.crc32(true);

		if (model.url.endsWith('/'))
			model.url = model.url.substring(0, model.url.length - 1);

		DBMS().modify('tbl_settings', { body: model }).where('id', 'openplatform');
		EMIT('settings/update');
		FUNC.log('settings/update', null, '', $);
		$.success();
	});

	schema.addWorkflow('init', function($) {
		DBMS().one('tbl_settings').where('id', 'openplatform').callback(function(err, response) {
			if (response) {
				response = response.body;
				response.name && (CONF.name = response.name);
				CONF.url = response.url || '';
				CONF.author = response.author || '';
				CONF.email = response.email || '';
				CONF.accesstoken = response.accesstoken || GUID(30);
				CONF.colorscheme = response.colorscheme || '';
				CONF.background = response.background || '';
				CONF.mail_smtp = response.smtp || '';
				CONF.mail_smtp_options = typeof(response.smtpsettings) === 'string' ? response.smtpsettings.parseJSON() : response.smtpsettings;
				CONF.mail_address_from = response.sender;
				CONF.test = response.test;
				CONF.marketplace = response.marketplace;
				CONF.verifytoken = response.verifytoken;
				CONF.welcome = response.welcome;
				CONF.guest = response.guest;
				CONF.allownotifications = response.allownotifications == true;
				CONF.allownickname = response.allownickname == true;
				CONF.allowstatus = response.allowstatus != false;
				CONF.allowappearance = response.allowappearance != false;
				CONF.allowmembers = response.allowmembers == true;
				CONF.allowcreate = response.allowcreate;
				CONF.allowclock = response.allowclock != false;
				CONF.allowdesktop = response.allowdesktop != false;
				CONF.allowbackground = response.allowbackground != false;
				CONF.allowtheme = response.allowtheme != false;
				CONF.allowprofile = response.allowprofile != false;
				CONF.allowdesktopfluid = response.allowdesktopfluid != false;
				CONF.cookie_expiration = response.cookie_expiration || '3 days';
				CONF.defaultappid = response.defaultappid;
				CONF.maxmembers = response.maxmembers || 0;
				MAIN.id = CONF.url.crc32(true);
			}
			$.success(true);
		});
	});
});

NEWSCHEMA('Settings/SMTP').make(function(schema) {

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