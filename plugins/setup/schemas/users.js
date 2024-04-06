NEWSCHEMA('@User', 'language:lower,gender:{male|female},photo,*name,*email:Email,password,darkmode:Number,sounds:Boolean,notifications:Boolean,sa:Boolean,isconfirmed:Boolean,isdisabled:Boolean,isinactive:Boolean,iswelcome:Boolean,ispassword:Boolean,groups:[UID]');

NEWACTION('Users/list', {
	name: 'List of users',
	action: function($) {
		var builder = DATA.list('op.view_user');
		builder.autoquery($.query, 'id:UID,groups,photo,language,gender,name,sa:Boolean,isonline:Boolean,unread:Number,isdisabled:Boolean,isconfirmed:Boolean,isinactive:Boolean,email,logged:Number,dtlogged:Date,dtcreated:Date,dtupdated:Date', 'dtcreated_desc', 100);
		builder.callback($);
	}
});

NEWACTION('Users/read', {
	name: 'Read user',
	params: '*id:UID',
	action: async function($) {

		var params = $.params;
		var model = await DATA.read('op.tbl_user').id(params.id).where('isremoved=FALSE').promise($);

		delete model.token;
		delete model.password;

		var groups = await DATA.find('op.tbl_user_group').fields('groupid').where('userid', model.id).promise();
		model.groups = [];

		for (let m of groups)
			model.groups.push(m.groupid);

		$.callback(model);
	}
});

NEWACTION('Users/create', {
	name: 'Create user',
	input: '@User',
	action: async function($, model) {

		if (model.ispassword && !model.password) {
			$.invalid('password');
			return;
		}

		var groups = model.groups || EMPTYARRAY;
		var iswelcome = model.iswelcome;

		if (model.ispassword)
			model.password = model.password.sha256(CONF.salt);
		else
			delete model.password;

		model.ispassword = undefined;
		model.iswelcome = undefined;
		model.groups = undefined;

		if (!model.language)
			model.language = null;

		model.id = UID();
		model.search = model.name.toSearch();
		model.dtcreated = NOW = new Date();
		model.token = FUNC.checksum(GUID(30));

		if (!model.password)
			model.isreset = true;

		await DATA.insert('op.tbl_user', model).promise($);

		for (let m of groups) {
			let tmp = {};
			tmp.id = model.id + m;
			tmp.userid = model.id;
			tmp.groupid = m;
			await DATA.insert('op.tbl_user_group', tmp).promise($);
		}

		if (iswelcome) {
			if (!model.color)
				model.color = CONF.color;

			CONF.ismail && MAIL(model.email, '@(Welcome)', 'mail/welcome', model, NOOP, model.language || CONF.language || '');
		}

		$.success(model.id);
	}
});

NEWACTION('Users/update', {
	name: 'Update user',
	params: '*id:UID',
	input: '@User',
	action: async function($, model) {

		var params = $.params;

		if (model.ispassword && !model.password) {
			$.invalid('password');
			return;
		}

		await DATA.check('op.tbl_user').where('email', model.email).where('id', '<>', params.id).where('isremoved=FALSE').error('@(E-mail address is already used)', true).promise($);

		var groups = model.groups || EMPTYARRAY;
		var iswelcome = model.iswelcome == true;

		if (model.ispassword)
			model.password = model.password.sha256(CONF.salt);
		else
			delete model.password;

		model.ispassword = undefined;
		model.iswelcome = undefined;
		model.groups = undefined;

		model.search = model.name.toSearch();
		model.dtupdated = NOW;

		if (iswelcome)
			model.token = FUNC.checksum(GUID(30));

		if (!model.language)
			model.language = null;

		model.isprocessed = false;
		model.cache = null;
		model.cachefilter = null;

		await DATA.modify('op.tbl_user', model).id(params.id).error('@(User account not found)').where('isremoved=FALSE').promise($);
		await DATA.remove('op.tbl_user_group').where('userid', params.id).promise();

		// Read all groups from DB due to JSON imports
		groups = await DATA.find('op.tbl_group').in('id', groups).promise($);

		for (let m of groups) {
			let tmp = {};
			tmp.id = params.id + m.id;
			tmp.userid = params.id;
			tmp.groupid = m.id;
			await DATA.insert('op.tbl_user_group', tmp).promise($);
		}

		if (iswelcome) {
			if (!model.color)
				model.color = CONF.color;
			CONF.ismail && MAIL(model.email, '@(Welcome)', 'mail/welcome', model, NOOP, model.language || CONF.language || '');
		}

		$.success(params.id);
	}
});

NEWACTION('Users/remove', {
	name: 'Remove user',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		await DATA.modify('op.tbl_user', { isprocessed: false, isremoved: true, dtremoved: NOW }).id(params.id).error('@(User account not found)').where('isremoved=FALSE').promise($);
		$.success(params.id);
	}
});

NEWACTION('Users/assign', {
	name: 'Assign a group',
	params: '*id:UID',
	query: '*groupid:String',
	action: async function($) {

		var params = $.params;
		var remove = $.query.groupid[0] === '-';
		var groupid = $.query.groupid.substring(1);
		var id = params.id + groupid;

		var is = await DATA.check('op.tbl_user_group').id(id).promise($);
		if (is) {
			if (remove) {
				await DATA.remove('op.tbl_user_group').id(id).promise($);
				FUNC.clearcache('G' + groupid);
			}
		} else {
			if (!remove) {
				await DATA.insert('op.tbl_user_group', { id: id, userid: params.id, groupid: groupid }).promise($);
				await DATA.modify('op.tbl_user', { cache: null, cachefilter: null }).id(params.id).promise($);
			}
		}

		$.success();
	}
});

NEWACTION('Users/logout', {
	name: 'Logout user',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		await DATA.modify('op.tbl_user', { isonline: false }).id(params.id).error('@(User account not found)').where('isremoved=FALSE').promise($);
		await DATA.remove('op.tbl_session').where('userid', params.id).promise($);
		$.success(params.id);
	}
});
