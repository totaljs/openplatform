NEWSCHEMA('Workshop/View', function(schema) {
	schema.define('id', 'UID');
	schema.define('schemaid', 'UID', true);
	schema.define('name', 'String(50)', true);
	schema.define('icon', 'String(30)');
	schema.define('settings', 'JSON', true);
	schema.define('template', 'String(50)');
	schema.define('position', Number);
	schema.define('form', String);
	schema.define('list', 'JSON');
	schema.define('cancreate', Boolean);
	schema.define('canupdate', Boolean);
	schema.define('canremove', Boolean);
	schema.define('components', '[String]');
});

NEWSCHEMA('Workshop', function(schema) {

	schema.define('name', 'String(50)', true);
	schema.define('icon', 'String(30)', true);
	schema.define('views', '[Workshop/View]', true);
	schema.define('roles', '[String]');

	schema.setInsert(function($) {

		var model = $.clean();
		var db = DBMS();
		var views = model.views;

		model.id = UID();
		model.views = undefined;
		model.dtcreated = NOW;
		model.version = '1';
		model.isremoved = false;

		db.insert('tbl_workshop', model);

		for (var i = 0; i < views.length; i++) {
			var view = views[i];
			view.id = UID();
			view.parentid = null;
			view.workshopid = model.id;
			view.dtcreated = NOW;
			view.isremoved = false;
			view.ispublished = true;
			db.insert('tbl_workshop_view', view);
		}

		var app = {};
		app.id = app.workshopid = model.id;
		app.responsive = true;
		app.online = true;
		app.roles = model.roles;
		app.dtsync = app.dtcreated = NOW;
		app.mobilemenu = true;
		app.responsive = true;
		app.accesstoken = GUID(30);
		app.allowreadusers = 1;
		app.allowreadapps = 1;
		app.allowreadprofile = 1;
		app.allownotifications = true;
		app.frame = '/workshop/' + model.id + '/';
		app.name = app.title = model.name;
		app.linker = model.name.slug();
		app.search = model.name.toSearch();
		app.icon = prepare_icon(model.icon);
		app.author = $.user.company || $.user.name;
		app.email = $.user.email;
		app.resize = true;
		app.online = true;

		db.insert('tbl_app', app);

		db.callback(function() {
			FUNC.refreshapps(function() {
				FUNC.updateroles($.done(model.id));
			});
		});
	});

	schema.setUpdate(function($) {

		var model = $.clean();
		var db = DBMS();
		var views = model.views;

		model.views = undefined;
		model.dtupdated = NOW;

		db.modify('tbl_workshop', model).where('id', $.id);

		var app = {};
		app.roles = model.roles;
		app.dtsync = app.dtupdated = NOW;
		app.name = app.title = model.name;
		app.linker = model.name.slug();
		app.search = model.name.toSearch();
		app.icon = prepare_icon(model.icon);
		db.modify('tbl_app', app).where('id', $.id);

		var ids = [];

		for (var i = 0; i < views.length; i++) {
			var view = views[i];
			view.parentid = null;
			view.isremoved = false;
			view.ispublished = true;
			if (view.id) {
				view.dtupdated = NOW;
				db.modify('tbl_workshop_view', view).where('workshopid', $.id).where('id', view.id);
			} else {
				view.id = UID();
				view.workshopid = $.id;
				view.dtcreated = NOW;
				db.insert('tbl_workshop_view', view);
			}
			ids.push(view.id);
		}

		db.modify('tbl_workshop_view', { isremoved: true }).where('workshopid', $.id).notin('id', ids);
		db.callback(function() {
			FUNC.refreshapps(function() {
				FUNC.updateroles($.done(model.id));
			});
		});
	});

	schema.setRead(function($) {
		var db = DBMS();
		db.read('tbl_workshop').where('id', $.id);
		db.must('error-workshop-404');
		db.find('tbl_workshop_view').where('workshopid', $.id).query('isremoved=FALSE').set('views').sort('dtcreated');
		db.callback($.callback);
	});

	schema.setQuery(function($) {
		DBMS().find('tbl_workshop').fields('id,name,icon').query('isremoved=FALSE').sort('dtcreated', true).callback($.callback);
	});

	schema.setRemove(function($) {
		var db = DBMS();
		db.remove('tbl_app').where('id', $.id);
		db.modify('tbl_workshop', { isremoved: true, dtupdated: NOW }).where('id', $.id);
		db.callback($.done());
	});

	schema.addWorkflow('plugins', function($) {
		var plugins = [];
		for (var i = 0; i < MAIN.plugins.length; i++) {
			var item = MAIN.plugins[i];
			var obj = {};
			obj.id = item.meta.id;
			obj.name = item.meta.name;
			obj.icon = item.meta.icon;
			obj.version = item.meta.version;
			obj.html = item.html;
			obj.jseditor = item.jseditor;
			plugins.push(obj);
		}
		$.callback(plugins);
	});

	schema.addWorkflow('pluginsrefresh', function($) {
		EMIT('plugins/refresh');
		$.success();
	});

});

function prepare_icon(icon) {
	return icon.replace('fa-', '');
}