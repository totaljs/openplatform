var LDAPSYNC = null;

NEWSCHEMA('LDAP', function(schema) {

	schema.define('url', String);
	schema.define('user', String, true);
	schema.define('password', String, true);
	schema.define('dn', String);
	schema.define('active', Boolean);
	schema.define('interval', String);
	schema.define('mapper', String);

	var insert = function(doc, id) {
		doc.id = id;
		doc.name = id;
		delete doc.dtupdated;
		doc.dtcreated = NOW;
	};

	schema.setRead(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var data = {};
		for (var i = 0; i < schema.fields.length; i++) {
			var key = schema.fields[i];
			data[key] = CONF['ldap_' + key];
		}

		$.callback(data);
	});

	schema.setSave(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		var db = DBMS();
		for (var key in model) {
			var nk = 'ldap_' + key;
			var data = { type: key === 'active' ? 'boolean' : 'string', value: model[key] + '', dtupdated: NOW };
			db.modify('cl_config', data, true).id(nk).insert(insert, nk);
			CONF[nk] = model[key];
		}

		db.callback($.done());
	});

	schema.addWorkflow('test', function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		var opt = {};
		opt.ldap = FUNC.ldap_host(model.url);
		opt.type = 'group';
		opt.dn = model.dn;
		opt.user = model.user;
		opt.password = model.password;
		LDAP(opt, $.done());
	});

	schema.addWorkflow('import', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		import_groups($.successful(function() {
			import_users($.done(true));
		}));
	});

});

FUNC.ldap_host = function(url) {
	var uri = new URL(((url || CONF.ldap_url) || 'ldap://localhost:389').replace('ldap', 'http'));
	return { host: uri.hostname, port: +(uri.port || 389), timeout: +(uri.searchParams.get('timeout') || 3000) };
};

function import_groups(callback) {

	if (!CONF.ldap_active) {
		callback('@(LDAP is inactive)');
		return;
	}

	var opt = {};
	opt.ldap = FUNC.ldap_host();
	opt.type = 'group';
	opt.dn = CONF.ldap_dn;
	opt.user = CONF.ldap_user;
	opt.password = CONF.ldap_password;

	LDAP(opt, async function(err, response) {

		if (err) {
			callback && callback(err);
			return;
		}

		var groups = await DBMS().find('tbl_group').fields('id').promise();

		response.wait(function(item, next) {

			var name = item.sAMAccountName;

			if (groups.findItem('id', name)) {
				next();
				return;
			}

			var model = {};
			model.id = name;
			model.name = name;

			EXEC('+Users/Groups --> patch', model, function(err) {
				err && FUNC.log('LDAP/Error.group', model.id, err + '', { model: model });
				next();
			});

		}, callback);

	});
}

function import_users(callback) {

	if (!CONF.ldap_active) {
		callback('@(LDAP is inactive)');
		return;
	}

	var opt = {};
	opt.ldap = FUNC.ldap_host();
	opt.type = 'person';
	opt.dn = CONF.ldap_dn;
	opt.user = CONF.ldap_user;
	opt.password = CONF.ldap_password;

	var map = {};
	var mapper = (CONF.ldap_mapper || '').split(/,|;/);

	for (var i = 0; i < mapper.length; i++) {
		var tmp = mapper[i].split(/=|:/).trim();
		if (tmp[0] && tmp[1])
			map[tmp[0]] = tmp[1];
	}

	LDAP(opt, async function(err, response) {

		if (err) {
			callback && callback(err);
			return;
		}

		var users = await DBMS().find('tbl_user').fields('id,reference,checksum,dn').promise();
		var stamp = GUID(10);
		var updated = [];
		var countupdated = 0;
		var countinserted = 0;

		response.wait(function(item, next) {

			var model = {};

			model.reference = item.sAMAccountName;

			if (!model.reference) {
				next();
				return;
			}

			if (CONF.ldap_user.indexOf(model.reference) !== -1) {
				next();
				return;
			}

			var groups = [];

			if (item.memberOf) {
				if (!(item.memberOf instanceof Array))
					item.memberOf = [item.memberOf];
				for (var i = 0; i < item.memberOf.length; i++) {
					var dn = item.memberOf[i].split(',', 1)[0];
					var index = dn.indexOf('=');
					if (index !== -1)
						groups.push(dn.substring(index + 1));
				}
			}

			model.checksum = (item.displayName + '_' + item.distinguishedName + '_' + (item.mail || item.userPrincipalName) + '_' + groups.join(',')).makeid();

			var user = users.findItem('reference', model.reference);
			if (user) {

				model.id = user.id;
				countupdated++;

				if (model.checksum === user.checksum) {
					updated.push(model.id);
					next();
					return;
				}

			} else {

				model.name = item.displayName;

				if (!model.name) {
					FUNC.log('LDAP/Error.users', model.reference, model.reference + ': Empty name', { model: model, ldap: item });
					next();
					return;
				}

				var arr = model.name.split(' ');
				model.firstname = arr[0];
				model.lastname = arr[1];
				model.gender = 'male';
				model.language = CONF.language || 'en';
				model.timeformat = CONF.timerformat || 24;
				model.dateformat = CONF.dateformat || 'yyyy-MM-dd';
				model.numberformat = CONF.numberformat || 1;
				model.volume = 50;
				model.sounds = true;
				model.notifications = true;
				model.notificationsemail = true;
				model.notificationsphone = true;
				model.desktop = CONF.desktop || 3;
				countinserted++;
			}

			model.login = item.sAMAccountName;
			model.email = item.mail || item.userPrincipalName;
			model.dn = item.distinguishedName;
			model.groups = groups;
			model.stamp = stamp;
			model.inactive = false;

			// OP_NAME=LDAP_NAME
			for (var key in map)
				model[key] = item[map[key]];

			var ctrl = EXEC((model.id ? '#' : '+') + 'Users --> ' + (model.id ? 'patch' : 'insert'), model, function(err) {
				err && FUNC.log('LDAP/Error.users', model.reference, model.reference + ': ' + err + '', { model: model, ldap: item });
				next();
			});

			ctrl.id = model.id;

		}, function() {
			updated.limit(50, function(users, next) {
				DBMS().modify('tbl_user', { stamp: stamp }).in('id', users).callback(next);
			}, function() {
				DBMS().modify('tbl_user', { inactive: true }).query('LENGTH(dn)>0 AND stamp<>$1', [stamp]).callback(function(err, count) {
					callback && callback(err, { removed: count, inserted: countinserted, updated: countupdated });
				});
			});

		});

	});
}


// Auto-synchronization
ON('service', function() {
	if (CONF.ldap_active) {
		if (LDAPSYNC) {
			if (LDAPSYNC < NOW) {
				LDAPSYNC = NOW.add(CONF.ldap_interval);
				import_groups(function(err) {
					if (!err)
						import_users();
				});
			}
		} else
			LDAPSYNC = NOW.add(CONF.ldap_interval);
	}
});