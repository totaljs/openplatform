NEWSCHEMA('Users/Groups', function(schema) {

	schema.define('id', 'String(50)');
	schema.define('name', 'String(50)');
	schema.define('note', 'String(200)');
	schema.define('apps', '[Object]'); // [{ id: UID, roles: [] }]

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var arr = [];

		for (var i = 0; i < MAIN.groups.length; i++) {
			var group = MAIN.groups[i];
			var obj = {};
			obj.id = group.id;
			obj.name = group.name;
			obj.dtcreated = group.dtcreated;
			obj.dtupdated = group.dtupdated;
			obj.note = group.note;
			obj.apps = [];

			for (var j = 0; j < group.apps.length; j++) {
				var appid = group.apps[j];
				obj.apps.push({ id: appid, roles: group.appsroles[appid] || EMPTYARRAY });
			}

			arr.push(obj);
		}

		$.callback(arr);
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
			FUNC.refreshgroupsroles(function() {
				FUNC.refreshmeta($.done(id));
				EMIT('groups/' + (insert ? 'create' : 'udpate'), id);
			});
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
			FUNC.refreshgroupsroles(function() {
				FUNC.refreshmeta($.done());
				EMIT('groups/remove', id);
			});
		});
	});

});