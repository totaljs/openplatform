NEWSCHEMA('@Group', '*name,color:Color,icon:Icon,reference,permissions:[String]');

NEWACTION('Groups/list', {
	name: 'List of groups',
	action: function($) {
		DATA.find('op.view_group').autoquery($.query, 'id:UID,name,color,icon,users:Number,dtcreated:Date,dtupdated:Date', 'dtcreated_desc', 100).callback($);
	}
});

NEWACTION('Groups/read', {
	name: 'Read group',
	params: '*id:UID',
	action: async function($) {

		var params = $.params;
		var model = await DATA.read('op.tbl_group').id(params.id).error('@(Group not found)').promise($);
		var permissions = await DATA.find('op.tbl_group_permission').fields('permissionid,appid').where('groupid', model.id).promise($);
		model.permissions = [];

		for (let m of permissions)
			model.permissions.push(m.permissionid || ('_' + m.appid));

		$.callback(model);
	}
});

NEWACTION('Groups/create', {
	name: 'Create group',
	input: '@Group',
	action: async function($, model) {

		var permissions = model.permissions || EMPTYARRAY;
		model.permissions = undefined;
		model.id = UID();
		model.dtcreated = NOW;

		await DATA.insert('op.tbl_group', model).promise($);

		var apps = [];

		for (let m of permissions) {
			if (m[0] === '_')
				apps.push(m.substring(1));
		}

		for (let m of apps)
			permissions.splice(permissions.indexOf('_' + m), 1);

		var apermissions = await DATA.find('op.tbl_app_permission').fields('id,appid').in('id', permissions).promise($);

		for (let m of apermissions) {
			if (apps.includes(m.appid)) {
				m.permissionid = m.id;
				m.id = model.id + m.id;
				m.groupid = model.id;
				await DATA.insert('op.tbl_group_permission', m).promise($);
			}
		}

		// Permission for opening app
		for (let m of apps) {
			let tmp ={};
			tmp.id = UID();
			tmp.appid = m;
			tmp.groupid = model.id;
			await DATA.insert('op.tbl_group_permission', tmp).promise($);
		}

		$.success(model.id);
	}
});

NEWACTION('Groups/update', {
	name: 'Update group',
	params: '*id:UID',
	input: '@Group',
	action: async function($, model) {

		var params = $.params;
		var permissions = model.permissions;

		model.permissions = undefined;
		model.dtupdated = NOW;
		model.isprocessed = false;

		var apps = [];

		for (let m of permissions) {
			if (m[0] === '_')
				apps.push(m.substring(1));
		}

		for (let m of apps)
			permissions.splice(permissions.indexOf('_' + m), 1);

		await DATA.modify('op.tbl_group', model).id(params.id).error('@(Group not found)').promise($);
		await DATA.remove('op.tbl_group_permission').where('groupid', params.id).promise($);

		var apermissions = await DATA.find('op.tbl_app_permission').fields('id,appid').in('id', permissions).promise($);
		var aapps = await DATA.find('op.tbl_app').fields('id').in('id', apps).promise($);

		apps = [];
		for (var m of aapps)
			apps.push(m.id);

		for (let m of apermissions) {
			if (apps.includes(m.appid)) {
				m.permissionid = m.id;
				m.id = params.id + m.id;
				m.groupid = params.id;
				await DATA.insert('op.tbl_group_permission', m).promise($);
			}
		}

		// Permission for opening app
		for (let m of apps) {
			let tmp = {};
			tmp.id = UID();
			tmp.appid = m;
			tmp.groupid = params.id;
			await DATA.insert('op.tbl_group_permission', tmp).promise($);
		}

		FUNC.clearcache('G' + params.id);
		$.success(params.id);
	}
});

NEWACTION('Groups/remove', {
	name: 'Remove group',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		await DATA.remove('op.tbl_group').id(params.id).error('@(Group not found)').promise($);
		FUNC.clearcache('G' + params.id);
		$.success(params.id);
	}
});

NEWACTION('Groups/apps', {
	name: 'Read all apps with permissions',
	action: async function($) {

		var items = await DATA.find('op.tbl_app').fields('id,name,icon,color').where('isremoved=FALSE').sort('name').promise($);
		var permissions = await DATA.find('op.tbl_app_permission').fields('id,appid,name').promise($);

		for (var item of items)
			item.permissions = permissions.findAll('appid', item.id);

		$.callback(items);
	}
});
