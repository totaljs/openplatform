NEWACTION('Login/login', {
	name: 'Sign in',
	input: '*email:Email, *password:String',
	publish: true,
	action: async function($, model) {

		$.publish(model);

		var profile = await DATA.read('op.tbl_user').fields('id,name,reference,email,isdisabled,isinactive,isconfirmed').where('email', model.email).where('password', model.password.sha256(CONF.salt)).where('isremoved=FALSE').error('@(Invalid credentials)').promise($);

		if (!profile.isconfirmed) {
			$.invalid('@(Account is not confirmed)');
			return;
		}

		if (profile.isdisabled) {
			$.invalid('@(Account is disabled)');
			return;
		}

		if (profile.isinactive) {
			$.invalid('@(Account is inactive)');
			return;
		}

		MAIN.auth.login($, profile.id, $.done());
	}
});

NEWACTION('Login/reset', {
	name: 'Reset password',
	input: '*email:Email',
	publish: true,
	action: async function($, model) {

		$.publish(model);

		var profile = await DATA.read('op.tbl_user').fields('id,language,name,isdisabled,isinactive,color').where('email', model.email).where('isremoved=FALSE').error('@(Account not found)').promise($);

		if (profile.isdisabled) {
			$.invalid('@(Account is disabled)');
			return;
		}

		if (profile.isinactive) {
			$.invalid('@(Account is inactive)');
			return;
		}

		var data = {};

		data.token = FUNC.checksum(GUID(30));
		data.isreset = true;

		await DATA.modify('op.tbl_user', data).id(profile.id).promise($);

		profile.token = data.token;

		if (!profile.color)
			profile.color = CONF.color;

		CONF.ismail && MAIL(model.email, '@(Reset password)', 'mail/reset', profile, NOOP, profile.language || CONF.language || '');
		$.success();
	}
});

NEWACTION('Login/create', {
	name: 'Create account',
	input: '*name:String, *email:Email, *password:String',
	publish: 'id,name,email,dtcreated:Date',
	action: async function($, model) {

		await DATA.check('op.tbl_user').where('email', model.email).where('isremoved=FALSE').error('@(E-mail address is already used)', true).promise($);

		model.id = UID();
		model.dtcreated = NOW;
		model.password = model.password.sha256(CONF.salt);
		model.token = FUNC.checksum(GUID(30));
		model.color = CONF.color;
		model.sounds = true;
		model.notifications = true;

		await DATA.insert('op.tbl_user', model).promise($);
		$.publish(model);

		CONF.ismail && MAIL(model.email, '@(Welcome)', 'mail/welcome', model, NOOP, model.language || CONF.language || '');
		$.success();
	}
});