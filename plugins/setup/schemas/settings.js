NEWSCHEMA('Settings', function(schema) {

	schema.action('read', {
		name: 'Read settings',
		action: async function($) {
			var items = await DB().find('op.cl_config').fields('id,value,type').in('id', 'icon,name,url,mail_smtp,mail_smtp_options,language,mail_from,allow_tms,secret_tms,allow_token,token'.split(',')).promise($);
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

	schema.action('save', {
		name: 'Save settings',
		input: 'name:String, url:URL, language:Lower, mail_smtp:String, mail_smtp_options:JSON, mail_from:Email, icon:String, allow_tms:Boolean, secret_tms:String, allow_token:Boolean, token:String',
		action: async function($, model) {

			var db = DB();

			for (var key in model)
				await db.modify('op.cl_config', { value: model[key] }).id(key).promise();

			if (CONF.url !== model.url) {
				await db.query('UPDATE op.tbl_user_app SET notify=NULL, notifytoken=NULL WHERE notify IS NOT NULL OR notifytoken IS NOT NULL');
				await db.query('DELETE FROM op.tbl_app_session');
			}

			MAIN.reconfigure();
			$.success();
		}
	});

	schema.action('test', {
		name: 'Test SMTP settings',
		input: 'mail_smtp:String, mail_smtp_options:JSON, mail_from:Email',
		action: async function($, model) {
			var options = (model.mail_smtp_options || '').parseJSON();
			Mail.try(model.mail_smtp, options, $.done(true));
		}
	});

	schema.action('resources', {
		name: 'Loads list of resources',
		action: function($) {

			if (F.is5) {
				$.callback(Object.keys(F.resources));
				return;
			}

			F.Fs.readdir(PATH.resources(), function(err, files) {
				for (var i = 0; i < files.length; i++)
					files[i] = files[i].replace(/\.resource$/i, '').toLowerCase();
				$.callback(files);
			});
		}
	});

});