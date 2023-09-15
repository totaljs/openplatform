NEWSCHEMA('Apps/Permissions', function(schema) {
	schema.define('id', 'UID');
	schema.define('name', String, true);
	schema.define('value', String, true);
	schema.define('sortindex', Number);
});

NEWSCHEMA('Apps', function(schema) {

	schema.define('name', String, true);
	schema.define('color', 'Color');
	schema.define('icon', 'Icon');
	schema.define('meta', 'URL');
	schema.define('url', 'URL', true);
	schema.define('reqtoken', String, true);
	schema.define('restoken', String, true);
	schema.define('sortindex', Number);
	schema.define('notifications', Boolean);
	schema.define('isbookmark', Boolean);
	schema.define('isnewtab', Boolean);
	schema.define('isscrollbar', Boolean);
	schema.define('isdisabled', Boolean);

	// Not in DB
	schema.define('permissions', '[Apps/Permissions]');

	schema.action('list', {
		name: 'List of apps',
		action: function($) {
			DB().find('op.tbl_app').autoquery($.query, 'id:UID,name,color,icon,notifications:Boolean,isbookmark:Boolean,isnewtab:Boolean,isdisabled:Boolean,url:URL,logged:Number,dtlogged:Date,dtcreated:Date,dtupdated:Date', 'name', 1000).where('isremoved=FALSE').callback($.callback);
		}
	});

	schema.action('read', {
		name: 'Read app',
		params: '*id:UID',
		action: async function($) {
			var params = $.params;
			var db = DB();
			var model = await db.read('op.tbl_app').id(params.id).where('isremoved=FALSE').error('@(App not found)').promise($);
			model.cache = undefined;
			model.permissions = await db.find('op.tbl_app_permission').fields('id,name,value,sortindex').where('appid', model.id).promise($);
			$.callback(model);
		}
	});

	schema.action('create', {
		name: 'Create app',
		action: async function($, model) {

			var permissions = model.permissions;
			var db = DB();

			model.permissions = undefined;
			model.id = UID();
			model.dtcreated = NOW;

			if (!model.sortindex)
				model.sortindex = (await db.count('op.tbl_app').promise()) + 1;

			await db.insert('op.tbl_app', model).promise($);

			for (let m of permissions) {
				if (!m.id || m.id[0] === '_')
					m.id = UID();
				m.appid = model.id;
				await db.insert('op.tbl_app_permission', m).promise($);
			}

			$.success(model.id);
		}
	});

	schema.action('update', {
		name: 'Update app',
		params: '*id:UID',
		action: async function($, model) {

			var params = $.params;
			var newpermissions = model.permissions;

			if (model.isbookmark)
				newpermissions = EMPTYARRAY;

			model.permissions = undefined;

			// Because of generated tokens
			model.restoken = undefined;
			model.reqtoken = undefined;

			model.dtupdated = NOW;
			model.isprocessed = false;

			var db = DB();

			await db.modify('op.tbl_app', model).id(params.id).error('@(App not found)').where('isremoved=FALSE').promise($);

			var oldpermissions = await db.find('op.tbl_app_permission').where('appid', params.id).promise($);
			var diff = DIFFARR('id', oldpermissions, newpermissions);

			for (let m of diff.add) {
				m.id = UID();
				m.appid = params.id;
				await db.insert('op.tbl_app_permission', m).promise($);
			}

			for (let m of diff.upd) {
				m.form.id = undefined;
				await db.modify('op.tbl_app_permission', m.form).id(m.db.id).where('appid', params.id).promise($);
			}

			for (let m of diff.rem)
				await db.remove('op.tbl_app_permission').id(m).where('appid', params.id).promise($);

			FUNC.clearcache('A' + params.id);
			$.success(params.id);
		}
	});

	schema.action('remove', {
		name: 'Remove app',
		params: '*id:UID',
		action: async function($) {
			var params = $.params;
			var db = DB();
			await db.modify('op.tbl_app', { isprocessed: false, isremoved: true, dtremoved: NOW }).id(params.id).error('@(App not found)').where('isremoved=FALSE').promise($);
			FUNC.clearcache('A' + params.id);
			$.success(params.id);
		}
	});

	schema.action('download', {
		name: 'Download meta',
		query: '*url:URL',
		action: function($) {
			RESTBuilder.GET($.query.url).callback($.callback);
		}
	});

});