NEWSCHEMA('UI/Sources', function(schema) {

	schema.define('id', 'String(30)');
	schema.define('appid', String, true);
	schema.define('type', 'String(10)', true);
	schema.define('name', 'String(50)', true);
	schema.define('properties', Object);
	schema.define('url', Object);
	schema.define('color', 'String(7)');
	schema.define('icon', 'String(30)');
	schema.define('static', Boolean);

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (!$.query.id) {
			$.callback(EMPTYARRAY);
			return;
		}

		DBMS().find('tbl_app_source').where('appid', $.query.id).where('isremoved=FALSE').callback($.callback);
	});

	schema.setSave(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (model.url)
			model.url = JSON.stringify(model.url);
		else
			model.url = null;

		if (model.properties)
			model.properties = JSON.stringify(model.properties);
		else
			model.properties = null;

		var db = DBMS();
		var builder = db.modify('tbl_app_source', model, true);
		builder.id(model.id);
		builder.where('appid', model.appid);
		builder.where('isremoved=FALSE');
		builder.callback($.done(model.id));

		var data = CLONE(model);
		data.uid = data.id;
		data.id = undefined;
		data.userid = $.user.id;
		data.dtupdated = undefined;
		db.insert('tbl_app_source_bk', data);
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (!$.query.id) {
			$.callback(EMPTYARRAY);
			return;
		}

		var builder = DBMS().modify('tbl_app_source', { isremoved: true });
		builder.id($.id);
		builder.where('appid', $.query.id);
		builder.where('isremoved=FALSE');
		builder.callback($.done($.id));
	});

});

NEWSCHEMA('UI/Components', function(schema) {

	schema.define('id', 'Url', true);

	schema.setQuery(function($) {
		DBMS().find('cl_component').fields('id').sort('dtcreated', true).callback(function(err, response) {
			for (var i = 0; i < response.length; i++)
				response[i] = response[i].id;
			$.callback(response);
		});
	});

	schema.setSave(function($, model) {
		if ($.controller && FUNC.notadmin($))
			return;
		model.dtcreated = NOW;
		DBMS().insert('cl_component', model, true).id(model.id).error('error-components-exists').callback($.done());
	});

	schema.setRemove(function($, model) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().remove('cl_component').id(model.id || 'XyZ').callback($.done());
	});

});

NEWSCHEMA('UI/Actions', function(schema) {

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (!$.query.id) {
			$.callback(EMPTYARRAY);
			return;
		}

		DBMS().all('tbl_app_ui').fields('id,name,type').where('appid', $.query.id).callback(function(err, response) {

			for (var i = 0; i < response.length; i++) {
				var item = response[i];
				item.id = '@' + item.id;
				item.name = '@' + item.name;
			}

			DBMS().all('tbl_app_source').fields('id,name,type').where('type IN (\'crud\',\'action\')').where('appid', $.query.id).callback(function(err, sources) {

				for (var i = 0; i < sources.length; i++) {
					var item = sources[i];
					item.id = 'source ' + item.id;
					item.name = (item.type === 'crud' ? 'DELETE ' : '') + item.name;
				}

				response.push.apply(response, sources);
				response.push({ id: 'back', name: TRANSLATE($.user.language, 'Back') });
				response.quicksort('name');
				$.callback(response);
			});
		});
	});

});

NEWSCHEMA('UI', function(schema) {

	schema.define('id', UID);
	schema.define('appid', UID);
	schema.define('sourceid', 'String(30)');
	schema.define('type', 'String(20)', true);
	schema.define('name', 'String(50)', true);
	schema.define('icon', 'String(30)', true);
	schema.define('isnavigation', Boolean);
	schema.define('design', String);
	schema.define('changelog', String);
	schema.define('settings', Object)(null);
	schema.define('onchange', String);
	schema.define('onload', String);
	schema.define('onsubmit', String);
	schema.define('onvalidate', String);

	schema.setQuery(function($) {

		if (!$.query.id) {
			$.callback(EMPTYARRAY);
			return;
		}

		DBMS().find('tbl_app_ui').fields('id,appid,name,icon,isnavigation,dtcreated,dtupdated,type,changelog,position').callback($.callback).sort('name').where('appid', $.query.id).where('isremoved=FALSE');
	});

	schema.setRead(function($) {

		if (!$.query.id) {
			$.callback(EMPTYARRAY);
			return;
		}

		DBMS().read('tbl_app_ui').id($.id).where('appid', $.query.id).where('isremoved=FALSE').error('404').callback($.callback);
	});

	schema.setSave(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (model.settings)
			model.settings = JSON.stringify(model.settings);
		else
			model.settings = null;

		model.dtupdated = NOW;
		model.appid = $.query.id;

		if (!model.id)
			model.id = UID();

		var db = DBMS();

		if (!model.sourceid)
			model.sourceid = null;

		if (model.type !== 'view')
			model.isnavigation = false;

		db.modify('tbl_app_ui', model, true).id(model.id).where('appid', model.appid).where('isremoved=FALSE').callback($.done(model.id));

		if ($.query.nobackup)
			return;

		// Creates a backup
		var data = CLONE(model);
		data.uid = data.id;
		data.id = undefined;
		data.userid = $.user.id;
		data.dtupdated = undefined;
		data.isnavigation = undefined;
		db.insert('tbl_app_ui_bk', data);
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (!$.query.id) {
			$.callback(EMPTYARRAY);
			return;
		}

		var builder = DBMS().modify('tbl_app_ui', { isremoved: true, dtupdated: NOW });
		builder.id($.id);
		builder.where('appid', $.query.id);
		builder.where('isremoved=FALSE');
		builder.callback($.done($.id));
	});

	schema.addWorkflow('sort', function($) {

		if (!$.query.id || !$.query.apps) {
			$.success(false);
			return;
		}

		var arr = ($.query.apps || '').split(',');
		var db = DBMS();

		for (var i = 0; i < arr.length; i++)
			db.modify('tbl_app_ui', { position: i }).id(arr[i]).where('appid', $.query.id).where('isremoved=FALSE');

		db.callback($.done());
	});

});