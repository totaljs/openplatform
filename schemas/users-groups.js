NEWSCHEMA('Users/Groups', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('name', 'String(50)');
	schema.define('note', 'String(200)');
	schema.define('apps', '[Object]'); // [{ id: UID, roles: [] }]

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var db = DBMS();
		db.find('tbl_group').set('groups').sort('id');
		db.find('tbl_group_app').fields('appid as id,groupid,roles').set('apps');
		$.query.count && db.query('SELECT UNNEST(groups) as id, COUNT(1)::int4 as count FROM tbl_user GROUP BY UNNEST(groups)').set('count');
		db.callback(function(err, response) {

			for (var i = 0; i < response.groups.length; i++) {
				var item = response.groups[i];
				item.apps = response.apps.findAll('groupid', item.id);
				if (response.count)
					item.count = response.count.findValue('id', item.id, 'count');
			}

			$.callback(response.groups);
		});

	});

	schema.setPatch(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		var id = model.id || UID();
		var insert = false;
		var apps = model.apps;

		model.id = undefined;
		model.apps = undefined;
		model.dtupdated = NOW;

		var db = DBMS();

		$.extend && $.extend(model);

		db.upd('tbl_group', model, true).id(id).insert(function(doc) {
			doc.dtcreated = NOW;
			doc.dtupdated = undefined;
			doc.id = id;
			insert = true;
		});

		db.query('UPDATE tbl_user SET dtmodified=$1 WHERE groups && $2', [NOW, [id]]);

		if (apps) {

			if (!insert)
				db.remove('tbl_group_app').where('groupid', id);

			for (var i = 0; i < apps.length; i++) {
				var appmeta = apps[i];
				if (appmeta == null || !appmeta.id)
					continue;
				var appid = appmeta.id;
				var app = MAIN.apps.findItem('id', appmeta.id);
				if (app)
					db.insert('tbl_group_app', { id: id + appid, groupid: id, appid: appid, roles: appmeta.roles });
			}
		}

		db.log($, model, model.name);

		db.callback(function() {
			FUNC.refreshgroupsrolesdelay();
			FUNC.refreshmeta($.done());
			EMIT('groups/' + (insert ? 'create' : 'udpate'), id);
		});
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var id = $.query.id;
		var group = MAIN.groupscache[id];
		if (group == null) {
			$.error.replace('@', id);
			$.invalid('error-users-group');
			return;
		}

		var pgid = PG_ESCAPE(id);
		var db = DBMS();

		db.read('tbl_group').fields('name').query('id=' + pgid).error(404).data(response => db.log($, null, response.name));
		db.remove('tbl_group').query('id=' + pgid);
		db.query('UPDATE tbl_user SET dtmodified=NOW(), dtupdated=NOW(), groups=array_remove(groups,{0}) WHERE ({0}=ANY(groups))'.format(pgid));
		db.callback(function() {
			FUNC.refreshgroupsrolesdelay();
			FUNC.refreshmeta($.done());
			EMIT('groups/remove', id);
		});
	});

});