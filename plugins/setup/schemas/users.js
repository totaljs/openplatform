NEWSCHEMA('Users', function(schema) {

	schema.define('language', 'Lower');
	schema.define('gender', ['male', 'female']);
	schema.define('photo', String);
	schema.define('name', String, true);
	schema.define('email', 'Email', true);
	schema.define('password', String);
	schema.define('color', 'Color');
	schema.define('darkmode', Number); // 0: auto, 1: light, 2: dark
	schema.define('logged', Number);
	schema.define('sounds', Boolean);
	schema.define('notifications', Boolean);
	schema.define('sa', Boolean);
	schema.define('isconfirmed', Boolean);
	schema.define('isdisabled', Boolean);
	schema.define('isinactive', Boolean);

	// Not in DB
	schema.define('iswelcome', Boolean);
	schema.define('ispassword', Boolean);
	schema.define('groups', '[UID]');

	schema.required('password', model => model.ispassword);

	schema.action('list', {
		name: 'List of users',
		action: function($) {
			var builder = DB().list('op.view_user');
			builder.autoquery($.query, 'id:UID,groups,photo,language,gender,name,sa:Boolean,isonline:Boolean,unread:Number,isdisabled:Boolean,isinactive:Boolean,email,logged:Number,dtlogged:Date,dtcreated:Date,dtupdated:Date', 'dtcreated_desc', 100);
			builder.callback($.callback);
		}
	});

	schema.action('read', {
		name: 'Read user',
		params: '*id:UID',
		action: async function($) {

			var params = $.params;
			var db = DB();
			var model = await db.read('op.tbl_user').id(params.id).where('isremoved=FALSE').promise($);

			delete model.token;
			delete model.password;

			var groups = await db.find('op.tbl_user_group').fields('groupid').where('userid', model.id).promise();
			model.groups = [];

			for (let m of groups)
				model.groups.push(m.groupid);

			$.callback(model);
		}
	});

	schema.action('create', {
		name: 'Create user',
		action: async function($, model) {

			var groups = model.groups;
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
			model.dtcreated = NOW;
			model.token = FUNC.checksum(GUID(30));

			if (!model.password)
				model.isreset = true;

			var db = DB();

			await db.insert('op.tbl_user', model).promise($);

			for (let m of groups) {
				let tmp = {};
				tmp.id = model.id + m;
				tmp.userid = model.id;
				tmp.groupid = m;
				await db.insert('op.tbl_user_group', tmp).promise($);
			}

			if (iswelcome) {
				if (!model.color)
					model.color = CONF.color;

				CONF.ismail && MAIL(model.email, '@(Welcome)', 'mail/welcome', model, NOOP, model.language || CONF.language || '');
			}

			$.success(model.id);
		}
	});

	schema.action('update', {
		name: 'Update user',
		params: '*id:UID',
		action: async function($, model) {

			var params = $.params;
			var db = DB();

			await db.check('op.tbl_user').where('email', model.email).where('id', '<>', params.id).where('isremoved=FALSE').error('@(E-mail address is already used)', true).promise($);

			var groups = model.groups;
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

			await db.modify('op.tbl_user', model).id(params.id).error('@(User account not found)').where('isremoved=FALSE').promise($);
			await db.remove('op.tbl_user_group').where('userid', params.id).promise();

			// Read all groups from DB due to JSON imports
			groups = await db.find('op.tbl_group').in('id', groups).promise($);

			for (let m of groups) {
				let tmp = {};
				tmp.id = params.id + m.id;
				tmp.userid = params.id;
				tmp.groupid = m.id;
				await db.insert('op.tbl_user_group', tmp).promise($);
			}

			if (iswelcome) {
				if (!model.color)
					model.color = CONF.color;
				CONF.ismail && MAIL(model.email, '@(Welcome)', 'mail/welcome', model, NOOP, model.language || CONF.language || '');
			}

			$.success(params.id);
		}
	});

	schema.action('remove', {
		name: 'Remove user',
		params: '*id:UID',
		action: async function($) {
			var params = $.params;
			var db = DB();
			await db.modify('op.tbl_user', { isprocessed: false, isremoved: true, dtremoved: NOW }).id(params.id).error('@(User account not found)').where('isremoved=FALSE').promise($);
			$.success(params.id);
		}
	});

	schema.action('assign', {
		name: 'Assign a group',
		params: '*id:UID',
		query: '*groupid:String',
		action: async function($) {

			var params = $.params;
			var db = DB();

			var remove = $.query.groupid[0] === '-';
			var groupid = $.query.groupid.substring(1);
			var id = params.id + groupid;

			var is = await db.check('op.tbl_user_group').id(id).promise($);
			if (is) {
				if (remove) {
					await db.remove('op.tbl_user_group').id(id).promise($);
					FUNC.clearcache('G' + groupid);
				}
			} else {
				if (!remove) {
					await db.insert('op.tbl_user_group', { id: id, userid: params.id, groupid: groupid }).promise($);
					await db.modify('op.tbl_user', { cache: null, cachefilter: null }).id(params.id).promise($);
				}
			}

			$.success();
		}
	});

	schema.action('logout', {
		name: 'Logout user',
		params: '*id:UID',
		action: async function($) {
			var params = $.params;
			var db = DB();
			await db.modify('op.tbl_user', { isonline: false }).id(params.id).error('@(User account not found)').where('isremoved=FALSE').promise($);
			await db.remove('op.tbl_session').where('userid', params.id).promise($);
			$.success(params.id);
		}
	});

});