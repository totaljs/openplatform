NEWACTION('Settings/read', {
	name: 'Read settings',
	action: async function($) {
		var items = await DATA.find('op.cl_config').fields('id,value,type').in('id', 'icon,name,url,mail_smtp,mail_smtp_options,language,mail_from,$tms,secret_tms,allow_token,token,newtab,sync,sync_token,color'.split(',')).promise($);
		var model = {};

		for (var m of items) {
			var value = m.value;
			switch (m.type) {
				case 'boolean':
					value = value == 'true';
					break;
				case 'number':
					value = value.parseFloat();
					break;
				case 'date':
					value = value.parseDate();
					break;
			}
			model[m.id] = value;
		}

		$.callback(model);
	}
});

NEWACTION('Settings/save', {
	name: 'Save settings',
	input: 'name:String, url:URL, color:Color, language:Lower, mail_smtp:String, mail_smtp_options:JSON, mail_from:Email, icon:String, $tms:Boolean, secret_tms:String, allow_token:Boolean, token:String, newtab:Boolean, sync:Boolean, sync_token:String',
	action: async function($, model) {

		for (var key in model)
			await DATA.modify('op.cl_config', { value: model[key] }).id(key).promise();

		if (CONF.url !== model.url) {
			await DATA.query('UPDATE op.tbl_user_app SET notify=NULL, notifytoken=NULL WHERE notify IS NOT NULL OR notifytoken IS NOT NULL');
			await DATA.query('DELETE FROM op.tbl_app_session');
		}

		MAIN.reconfigure();
		$.success();
	}
});

NEWACTION('Settings/test', {
	name: 'Test SMTP settings',
	input: '*mail_smtp, mail_smtp_options:JSON, mail_from:Email',
	action: async function($, model) {
		var options = (model.mail_smtp_options || '').parseJSON() || {};
		options.server = model.mail_smtp;
		Mail.try(options, $.done(true));
	}
});

NEWACTION('Settings/resources', {
	name: 'Loads list of resources',
	action: function($) {
		$.callback(Object.keys(F.resources));
	}
});