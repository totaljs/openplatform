NEWSCHEMA('@Apps/Permissions', 'id,*name,*value,sortindex:Number');
NEWSCHEMA('@Apps', '*name,color:Color,icon:Icon,meta:URL,*url:URL,*reqtoken,*restoken,sortindex:Number,notifications:Boolean,isbookmark:Boolean,isnewtab:Boolean,isscrollbar:Boolean,isdisabled:Boolean,isexternal:Boolean,permissions:[@Apps/Permissions]');

NEWACTION('Apps/list', {
	name: 'List of apps',
	action: function($) {
		DATA.find('op.tbl_app').autoquery($.query, 'id:UID,name,url,color,icon,notifications:Boolean,isexternal:Boolean,isbookmark:Boolean,isnewtab:Boolean,isdisabled:Boolean,url:URL,logged:Number,dtlogged:Date,dtcreated:Date,dtupdated:Date', 'name', 1000).where('isremoved=FALSE').callback($);
	}
});

NEWACTION('Apps/read', {
	name: 'Read app',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		var model = await DATA.read('op.tbl_app').id(params.id).where('isremoved=FALSE').error('@(App not found)').promise($);
		model.cache = undefined;
		model.permissions = await DATA.find('op.tbl_app_permission').fields('id,name,value,sortindex').where('appid', model.id).promise($);
		$.callback(model);
	}
});

NEWACTION('Apps/create', {
	name: 'Create app',
	input: '@Apps',
	action: async function($, model) {

		var permissions = model.permissions || [];

		model.permissions = undefined;
		model.id = UID();
		model.dtcreated = NOW;

		if (!model.sortindex)
			model.sortindex = (await DATA.count('op.tbl_app').promise()) + 1;

		await DATA.insert('op.tbl_app', model).promise($);

		for (let m of permissions) {
			if (!m.id || m.id[0] === '_')
				m.id = UID();
			m.appid = model.id;
			await DATA.insert('op.tbl_app_permission', m).promise($);
		}

		$.success(model.id);
	}
});

NEWACTION('Apps/update', {
	name: 'Update app',
	params: '*id:UID',
	input: '@Apps',
	action: async function($, model) {

		var params = $.params;
		var newpermissions = model.permissions || [];

		if (model.isbookmark)
			newpermissions = EMPTYARRAY;

		model.permissions = undefined;
		model.dtupdated = NOW;
		model.isprocessed = false;

		await DATA.modify('op.tbl_app', model).id(params.id).error('@(App not found)').where('isremoved=FALSE').promise($);

		var oldpermissions = await DATA.find('op.tbl_app_permission').where('appid', params.id).promise($);
		var diff = DIFFARR('id', oldpermissions, newpermissions);

		for (let m of diff.add) {
			m.id = UID();
			m.appid = params.id;
			await DATA.insert('op.tbl_app_permission', m).promise($);
		}

		for (let m of diff.upd) {
			m.form.id = undefined;
			await DATA.modify('op.tbl_app_permission', m.form).id(m.db.id).where('appid', params.id).promise($);
		}

		for (let m of diff.rem)
			await DATA.remove('op.tbl_app_permission').id(m).where('appid', params.id).promise($);

		FUNC.clearcache('A' + params.id);
		$.success(params.id);
	}
});

NEWACTION('Apps/remove', {
	name: 'Remove app',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		await DATA.modify('op.tbl_app', { isprocessed: false, isremoved: true, dtremoved: NOW }).id(params.id).error('@(App not found)').where('isremoved=FALSE').promise($);
		FUNC.clearcache('A' + params.id);
		$.success(params.id);
	}
});

NEWACTION('Apps/download', {
	name: 'Download meta',
	query: '*url:URL',
	action: function($) {
		RESTBuilder.GET($.query.url).callback($);
	}
});