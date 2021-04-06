const Path = require('path');
const Fs = require('fs');
const BOOL = { '1': 'true', 'true': 'true' };
const BLACKLIST = { login: 1, password: 1, rebuildaccesstoken: 1, rebuildtoken: 1, pin: 1, apps: 1, welcome: 1, background: 1, volume: 1, previd: 1, otpsecret: 1, repo: 1, checksum: 1, stamp: 1 };

function isdatemodified(dt1, dt2) {
	if (dt1 instanceof Date && dt2 instanceof Date)
		return dt1.getTime() !== dt2.getTime();
	return dt1 !== dt2;
}

NEWSCHEMA('Users', function(schema) {

	schema.define('previd', 'UID')(null); // internal for re-importing of users

	schema.define('supervisorid', 'UID')(null);
	schema.define('deputyid', 'UID')(null);
	schema.define('groupid', 'String(30)');
	// schema.define('directory', 'Lower(25)');
	schema.define('ou', 'String(500)');
	schema.define('photo', 'String(150)');
	schema.define('contractid', Number);
	schema.define('statusid', Number);
	schema.define('status', 'String(70)');
	schema.define('firstname', 'Name(40)', true);
	schema.define('lastname', 'Name(40)', true);
	schema.define('middlename', 'Name(40)');
	schema.define('gender', ['male', 'female'], true);
	schema.define('email', 'Email', true);
	schema.define('phone', 'Phone');
	schema.define('company', 'String(40)');
	schema.define('language', 'Lower(2)');
	schema.define('reference', 'String(100)');
	schema.define('position', 'String(40)');
	schema.define('locality', 'String(40)');
	schema.define('note', 'String(80)');
	schema.define('dn', 'String(500)');
	schema.define('login', 'String(120)');
	schema.define('locking', Number); // in minutes (0 = disabled)
	schema.define('password', 'String(70)');
	schema.define('groups', '[String]');
	schema.define('colorscheme', 'Lower(7)');
	schema.define('checksum', 'String(30)'); // a custom helper
	schema.define('background', 'String(150)');
	schema.define('blocked', Boolean);
	schema.define('welcome', Boolean);
	schema.define('darkmode', Boolean);
	schema.define('desktop', Number);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('dateformat', ['yyyy-MM-dd', 'dd.MM.yyyy', 'MM.dd.yyyy'])('yyyy-MM-dd'); // date format
	schema.define('timeformat', [12, 24])(24); // 12 or 24
	schema.define('numberformat', [1, 2, 3, 4])(1); // 1: "1 000.10", 2: "1 000,10", 3: "100,000.00", 4: "100.000,00"
	schema.define('volume', Number)(50);
	schema.define('sa', Boolean);
	schema.define('repo', 'JSON');
	schema.define('inactive', Boolean);
	schema.define('otp', Boolean);
	schema.define('sounds', Boolean);
	schema.define('rebuildtoken', Boolean);
	schema.define('rebuildaccesstoken', Boolean);
	schema.define('dtbirth', Date);
	schema.define('dtbeg', Date);
	schema.define('dtend', Date);
	schema.define('apps', '[Object]');  // [{ id: UID, roles: [] }]
	schema.define('oauth2', 'UID');
	schema.define('stamp', 'String(25)');

	var fields = { id: 1, name: 1, online: 1, dtcreated: 1, dtupdated: 1, dtmodified: 1, dtlogged: 1 };
	var fieldsall = ['id', 'name', 'online', 'dtcreated', 'dtupdated', 'dtmodified', 'dtlogged', 'note', 'running'];
	var fieldsallpublic = ['id', 'name', 'online', 'dtcreated', 'dtupdated', 'dtmodified', 'dtlogged', 'verifytoken', 'accesstoken'];

	(function() {
		for (var i = 0; i < schema.fields.length; i++) {
			var key = schema.fields[i];
			if (!BLACKLIST[key]) {
				fields[key] = 1;
				fieldsall.push(key);
				fieldsallpublic.push(key);
			}
		}
	})();

	schema.setRead(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		FUNC.users_read($.id, function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			$.extend(response, function() {
				DBMS().query('SELECT (SELECT COUNT(1)::int4 FROM tbl_user_session WHERE online=TRUE AND userid={0}) as used, (SELECT COUNT(1)::int4 FROM tbl_user_session WHERE online=FALSE AND userid={0}) as free'.format(PG_ESCAPE($.id))).first().callback(function(err, session) {
					if (session)
						session.count = session.used + session.free;
					response.session = session;
					$.callback(response);
				});
			});
		});
	});

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var opt = $.query;

		if (typeof(opt.id) === 'string')
			opt.id = opt.id.split(',');

		if (opt.q)
			opt.q = opt.q.toSearch();

		if (!opt.page)
			opt.page = 1;

		if (!opt.limit)
			opt.limit = 100;

		if (opt.limit > 1000)
			opt.limit = 1000;

		// Removed users
		if (opt.removed) {
			var builder = DBMS().list('tbl_user_removed');
			opt.modified && builder.where('dtcreated', '>', NOW.add('-' + opt.modified));
			builder.paginate(opt.page, opt.limit);
			builder.callback($.callback);
			return;
		}

		if (opt.groups)
			opt.group = opt.groups;

		if (opt.roles)
			opt.role = opt.roles;

		if (opt.directory) {
			// Is number?
			if ((/^\d+$/g).test(opt.directory)) {
				opt.directoryid = +opt.directory;
				opt.directory = null;
			}
		}

		if (opt.modified)
			opt.modified = NOW.add('-' + opt.modified);

		if (opt.logged)
			opt.logged = NOW.add('-' + opt.logged);

		var builder = DBMS().list('view_user');

		opt.id && builder.in('id', opt.id);
		opt.skipme && $.user && builder.where('id', '<>', $.user.id);
		opt.statusid && builder.where('statusid', opt.statusid);
		opt.contractid && builder.where('contractid', +opt.contractid);
		opt.directoryid && builder.where('directoryid', opt.directoryid);
		opt.directory && builder.gridfilter('directory', opt, String);
		opt.locality && builder.gridfilter('locality', opt, String);
		opt.language && builder.gridfilter('language', opt, String);
		opt.groupid && builder.gridfilter('groupid', opt, String);
		opt.company && builder.gridfilter('company', opt, String);
		opt.gender && builder.where('gender', opt.gender);
		opt.reference && builder.gridfilter('reference', opt, String);
		opt.position && builder.gridfilter('position', opt, String);
		opt.photo && builder.query(opt.photo === 'true' ? 'LENGTH(photo)>0' : '(LENGTH(photo)=0 OR photo IS NULL)');
		opt.supervisor && builder.gridfilter('supervisor', opt, String);
		opt.note && builder.gridfilter('note', opt, String);
		opt.dn && builder.gridfilter('dn', opt, String);
		opt.deputy && builder.gridfilter('deputy', opt, String);
		opt.desktop && builder.gridfilter('desktop', opt, Number);
		opt.inactive && builder.query('inactive=' + (BOOL[opt.inactive] || 'false'));
		opt.active && builder.query('inactive={0} AND blocked={0}'.format(BOOL[opt.active] || 'false') === 'true' ? 'false' : 'true');
		opt.blocked && builder.query('blocked=' + (BOOL[opt.blocked] || 'false'));
		opt.darkmode && builder.query('darkmode=' + (BOOL[opt.darkmode] || 'false'));
		opt.sa && builder.query('sa=' + (BOOL[opt.sa] || 'false'));
		opt.otp && builder.query('otp=' + (BOOL[opt.otp] || 'false'));
		opt.online && builder.query('online=' + (BOOL[opt.online] || 'false'));
		opt.customer && builder.query('customer=' + (BOOL[opt.customer] || 'false'));
		opt.q && builder.search('search', opt.q);
		opt.name && builder.gridfilter('name', opt, String);
		opt.firstname && builder.gridfilter('firstname', opt, String);
		opt.lastname && builder.gridfilter('lastname', opt, String);
		opt.middlename && builder.gridfilter('middlename', opt, String);
		opt.phone && builder.gridfilter('phone', opt, String);
		opt.email && builder.gridfilter('email', opt, String);
		opt.group && builder.query('$1=ANY (groups)', [opt.group]);
		opt.ou && builder.query('ou && $1', [opt.ou.split('/')]);
		opt.modified && builder.where('dtmodified', '>', opt.modified);
		opt.logged && builder.where('dtlogged', '<', opt.logged);
		opt.dtupdated && builder.gridfilter('dtupdated', opt, Date);
		opt.dtcreated && builder.gridfilter('dtcreated', opt, Date);
		opt.dtmodified && builder.gridfilter('dtmodified', opt, Date);
		opt.dtlogged && builder.gridfilter('dtlogged', opt, Date);

		if (opt.fields) {
			var rf = opt.fields.split(',');
			var plus = [];
			for (var i = 0; i < rf.length; i++) {
				var field = rf[i];
				if (fields[field])
					plus.push(field);
			}

			if (plus.length)
				builder.fields(plus.join(','));
			else
				builder.fields(fieldsall);

		} else
			builder.fields(fieldsall);

		if (opt.sort)
			builder.gridsort(opt.sort);
		else
			builder.sort('dtcreated', true);

		builder.paginate(opt.page, opt.limit);
		builder.callback($.callback);

		$.extend && $.extend(builder);

	}, 'statusid:Number,contractid:Number,page:Number,limit:Number,statusid:Number');

	schema.addWorkflow('check', function($, model) {

		if (!model.email && !model.login)
			return $.success();

		var internal = $.options ? $.options.internal : false;
		var id = ($.controller == null && model.previd ? model.previd : (internal ? $.options.id : '') || $.id) || 'x';
		var db = DBMS();

		if (model.email) {
			db.check('tbl_user').query('email=$1 AND id<>$2', [model.email, id]);
			db.err('error-users-email', true);
		}

		if (model.login) {
			db.check('tbl_user').query('login=$1 AND id<>$2', [model.login, id]);
			db.err('error-users-login', true);
		}

		db.callback($.done());
	});

	schema.setInsert(function($, model) {

		var internal = $.options ? $.options.internal : false;
		if (!internal && $.controller && FUNC.notadmin($))
			return;

		if (model.groups) {
			for (var i = 0; i < model.groups.length; i++) {
				if (!MAIN.groupscache[model.groups[i]]) {
					$.error.replace('@', model.groups[i]);
					return $.invalid('error-users-group');
				}
			}
		}

		var apps = model.apps;

		model.id = $.controller == null && model.previd ? model.previd : UID();
		model.name = (model.firstname + ' ' + model.lastname).max(40);
		model.search = model.name.toSearch();
		model.linker = model.name.slug();

		model.dtcreated = NOW;
		model.password = $.controller == null && model.previd ? model.password : model.password.hash(CONF.hashmode || 'sha256', CONF.hashsalt);
		model.verifytoken = U.GUID(15);
		model.accesstoken = U.GUID(40);
		model.dtupdated = NOW;
		model.dtmodified = NOW;
		model.ou = model.ou ? model.ou.split('/').trim() : null;

		model.rebuildaccesstoken = undefined;
		model.rebuildtoken = undefined;
		model.welcome = undefined;
		model.apps = undefined;

		if (!model.repo)
			model.repo = null;

		model.previd = undefined;

		if (model.groups)
			model.groups.sort();

		model.groupshash = model.groups ? (model.groups.join(',').crc32(true) + '') : '';

		if ($.user && $.user.directory) {
			model.directory = $.user.directory;
			model.directoryid = model.directory.crc32(true);
		} else
			model.directoryid = 0;

		if ($.model.welcome && !model.blocked && !model.inactive) {
			if ($.req)
				$.model.token = ENCRYPT({ id: model.id, date: NOW, type: 'welcome' }, CONF.secretpassword);
			MAIL(model.email, TRANSLATOR(model.language, '@(Welcome to {0})').format(CONF.name), '/mails/welcome', $.model, model.language);
		}

		$.extend(model, function() {
			DBMS().insert('tbl_user', model).callback(function(err) {

				if (err) {
					$.invalid(err);
					return;
				}

				if (apps && apps.length > 0) {
					model.apps = apps;
					processapps(model, function() {
						FUNC.refreshgroupsrolesdelay();
						FUNC.refreshmetadelay();
						$.success(model.id);
						EMIT('users/create', model.id);
					});
				} else {
					FUNC.refreshgroupsrolesdelay();
					FUNC.refreshmetadelay();
					$.success(model.id);
					EMIT('users/create', model.id);
				}
			}).log($, model, model.name);
		});
	});

	schema.setPatch(function($, model) {

		// Possibilities
		// $.options.internal + $.options.id + $.options.keys

		var internal = $.options ? $.options.internal : false;
		if (!internal && $.controller && FUNC.notadmin($))
			return;

		if (model.groups) {
			for (var i = 0; i < model.groups.length; i++) {
				if (!MAIN.groupscache[model.groups[i]]) {
					$.error.replace('@', model.groups[i]);
					return $.invalid('error-users-group');
				}
			}
		}

		if (model.roles) {
			for (var i = 0; i < model.roles.length; i++) {
				if (!MAIN.rolescache[model.roles[i]]) {
					$.error.replace('@', model.roles[i]);
					return $.invalid('error-users-role');
				}
			}
		}

		var rebuildaccesstoken = model.rebuildaccesstoken;
		var rebuildtoken = model.rebuildtoken;

		model.previd = undefined;

		var builder = DBMS().one('tbl_user');
		var id = (internal ? $.options.id : '') || $.id;

		if (id[0] === '@')
			builder.where('reference', id.substring(1));
		else
			builder.where('id', id);

		builder.orm().callback(function(err, response) {

			if (response == null) {
				$.invalid('error-users-404');
				return;
			}

			if ($.user && $.user.directory && response.directory !== $.user.directory) {
				$.invalid('error-permissions');
				return;
			}

			var tmp;
			var data = {};
			var keys = (internal ? $.options.keys : null) || $.keys;

			if (keys) {
				tmp = {};
				for (var i = 0; i < keys.length; i++)
					tmp[keys[i]] = 1;
				keys = tmp;
			}

			if (model.name) {
				model.name = FUNC.nicknamesanitize(model.name) || 'Invalid name';
				data.linker = model.linker = model.name.slug();
			}

			if (model.firstname && model.lastname && !model.name) {
				model.name = (model.firstname + ' ' + model.lastname).trim().max(40);
				data.search = model.search = (model.firstname + ' ' + model.lastname).trim().max(40).toSearch();
				data.linker = model.linker = model.name.slug();
			}

			// Removing older background
			if ((!keys || keys.background) && response.background && model.background !== response.background) {
				var path = Path.join(FUNC.uploadir('backgrounds'), response.background);
				Fs.unlink(path, NOOP);
				TOUCH('/' + path);
			}

			if ((!keys || keys.password) && model.password && !model.password.startsWith('***'))
				data.password = model.password.hash(CONF.hashmode || 'sha256', CONF.hashsalt);

			var modified = false;

			if ((!keys || keys.supervisorid) && response.supervisorid !== model.supervisorid) {
				data.supervisorid = model.supervisorid;
				modified = true;
			}

			if ((!keys || keys.deputyid) && response.deputyid !== model.deputyid) {
				data.deputyid = model.deputyid;
				modified = true;
			}

			if ((!keys || keys.stamp) && response.stamp !== model.stamp)
				data.stamp = model.stamp;

			if ((!keys || keys.sa) && response.sa !== model.sa) {
				data.sa = model.sa;
				modified = true;
			}

			if ((!keys || keys.checksum) && response.checksum !== model.checksum)
				data.checksum = model.checksum;

			if ((!keys || keys.reference) && response.reference !== model.reference) {
				data.reference = model.reference;
				modified = true;
			}

			if (!keys || keys.repo) {

				if (response.repo && typeof(response.repo) === 'object')
					response.repo = JSON.stringify(response.repo);

				if (response.repo !== model.repo) {
					if (model.repo)
						data.repo = model.repo;
					else
						data.repo = null;
					modified = true;
				}
			}

			if ((!keys || keys.blocked) && response.blocked !== model.blocked) {
				data.blocked = model.blocked;
				modified = true;
			}

			if ((!keys || keys.note) && response.note !== model.note)
				data.note = model.note;

			if ((!keys || keys.phone) && response.phone !== model.phone) {
				data.phone = model.phone;
				modified = true;
			}

			if ((!keys || keys.photo) && response.photo !== model.photo) {
				data.photo = model.photo;
				modified = true;
			}

			if ((!keys || keys.statusid) && response.statusid !== model.statusid) {
				data.statusid = model.statusid;
				modified = true;
			}

			if ((!keys || keys.status) && response.status !== model.status) {
				data.status = model.status;
				modified = true;
			}

			if ((!keys || keys.otp) && response.otp && !model.otp) {
				data.otp = false;
				response.otpsecret = null;
			}

			if (!keys || keys.locking)
				data.locking = model.locking;

			if ((!keys || keys.firstname) && response.firstname !== model.firstname) {
				data.firstname = model.firstname;
				modified = true;
			}

			if ((!keys || keys.lastname) && response.lastname !== model.lastname) {
				data.lastname = model.lastname;
				modified = true;
			}

			if ((!keys || keys.middlename) && response.middlename !== model.middlename) {
				data.middlename = model.middlename;
				modified = true;
			}

			if ((!keys || keys.directory) && response.directory !== model.directory) {
				data.directory = model.directory;
				data.directoryid = data.directory ? data.directory.crc32(true) : 0;
				modified = true;
			}

			if ((!keys || keys.email) && response.email !== model.email) {
				data.email = model.email;
				modified = true;
			}

			if (model.name && response.name !== model.name) {
				data.name = model.name;
				modified = true;
			}

			if ((!keys || keys.company) && response.company !== model.company) {
				data.company = model.company;
				modified = true;
			}

			if ((!keys || keys.gender) && response.gender !== model.gender) {
				data.gender = model.gender;
				modified = true;
			}

			if ((!keys || keys.groupid) && response.groupid !== model.groupid) {
				data.groupid = model.groupid;
				modified = true;
			}

			if (!keys || keys.groups) {

				tmp = [];
				for (var i = 0; i < model.groups.length; i++) {
					var item = model.groups[i];
					if (tmp.indexOf(item) === -1)
						tmp.push(item);
				}

				model.groups = tmp;

				if (model.groups)
					model.groups.sort();

				var grouphash = model.groups ? (model.groups.join(',').crc32(true) + '') : '';
				if (response.grouphash !== grouphash)
					modified = true;

				data.groupshash = grouphash;
				data.groups = model.groups;
			}

			if (!keys || keys.roles)
				data.roles = model.roles;

			if ((!keys || keys.language) && response.language !== model.language) {
				data.language = model.language;
				modified = true;
			}

			var ou = response.ou ? response.ou.join('/') : null;

			if ((!keys || keys.ou) && ou !== model.ou) {
				data.ou = model.ou ? model.ou.split('/').trim() : null;
				modified = true;
			}

			if ((!keys || keys.dn) && response.dn !== model.dn) {
				data.dn = model.dn;
				modified = true;
			}

			if ((!keys || keys.locality) && response.locality !== model.locality) {
				data.locality = model.locality;
				modified = true;
			}

			if ((!keys || keys.position) && response.position !== model.position) {
				data.position = model.position;
				modified = true;
			}

			if (!keys || keys.login)
				data.login = model.login;

			if ((!keys || keys.contractid) && response.contractid !== model.contractid) {
				data.contractid = model.contractid;
				data.customer = model.contractid === 5;
				modified = true;
			}

			if (!keys || keys.notifications)
				data.notifications = model.notifications;

			if (!keys || keys.sounds)
				data.sounds = model.sounds;

			data.dtupdated = NOW;

			if (!keys || keys.volume)
				data.volume = model.volume;

			if (!keys || keys.desktop)
				data.desktop = model.desktop;

			if ((!keys || keys.dtbirth) && isdatemodified(response.dtbirth, model.dtbirth)) {
				data.dtbirth = model.dtbirth;
				modified = true;
			}

			if ((!keys || keys.dtbeg) && isdatemodified(response.dtbeg, model.dtbeg)) {
				data.dtbeg = model.dtbeg;
				modified = true;
			}

			if ((!keys || keys.dtend) && isdatemodified(response.dtend, model.dtend)) {
				data.dtend = model.dtend;
				modified = true;
			}

			if ((!keys || keys.inactive) && response.inactive != model.inactive) {
				data.inactive = model.inactive;
				modified = true;
			}

			if (!keys || keys.notificationsphone)
				data.notificationsphone = model.notificationsphone;

			if (!keys || keys.notificationsemail)
				data.notificationsemail = model.notificationsemail;

			if (!keys || keys.darkmode)
				data.darkmode = model.darkmode;

			if (!keys || keys.dateformat) {
				tmp = model.dateformat || 'yyyy-MM-dd';
				if (response.dateformat !== tmp) {
					data.dateformat = tmp;
					modified = true;
				}
			}

			if (!keys || keys.timeformat) {
				tmp = model.timeformat || 24;
				if (response.timeformat !== tmp) {
					data.timeformat = tmp;
					modified = true;
				}
			}

			if (!keys || keys.numberformat) {
				tmp = model.numberformat || 1;
				if (response.numberformat !== tmp) {
					data.numberformat = tmp;
					modified = true;
				}
			}

			if (rebuildtoken || (!keys && rebuildtoken))
				data.verifytoken = GUID(15);

			if (rebuildaccesstoken || (!keys && rebuildaccesstoken))
				data.accesstoken = GUID(40);

			if (modified)
				data.dtmodified = NOW;

			if ((!keys || keys.colorscheme) && response.colorscheme !== model.colorscheme)
				data.colorscheme = model.colorscheme;

			$.extend(data, function() {

				if ($.model.welcome) {
					var mailmodel = {};
					mailmodel.firstname = response.firstname;
					mailmodel.id = response.id;
					mailmodel.token = ENCRYPT({ id: response.id, date: NOW, type: 'welcome' }, CONF.secretpassword);
					mailmodel.login = response.login;
					MAIL(model.email, TRANSLATOR(response.language, '@(Welcome to {0})').format(CONF.name), '/mails/welcome', mailmodel, response.language);
				}

				var id = response.id;
				response.dbms.replace(data).log($, data, response.name).save(function() {
					if (!keys || keys.apps) {
						model.id = id;
						processapps(model, function() {
							$.success(id);
							EMIT('users/update', id);
							MAIN.session.refresh(id);
							FUNC.clearcache(id);

							if (!keys || keys.apps || keys.groups)
								FUNC.refreshgroupsrolesdelay();

							if (!keys || keys.company || keys.groups || keys.locality || keys.language || keys.directory)
								FUNC.refreshmetadelay();

						});
					} else {
						$.success(id);
						EMIT('users/update', id);
						MAIN.session.refresh(id);
						FUNC.clearcache(id);

						if (!keys || keys.apps || keys.groups)
							FUNC.refreshgroupsrolesdelay();

						if (!keys || keys.company || keys.groups || keys.locality || keys.language || keys.directory)
							FUNC.refreshmetadelay();
					}
				});
			});
		});
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var id = $.id;

		if ($.user.id === id) {
			$.invalid('error-users-current');
			return;
		}

		var db = DBMS();
		db.read('tbl_user').id(id).fields('id,supervisorid,deputyid,name,reference,groupid,groups,contractid').callback(function(err, response) {
			if (response) {

				db.insert('tbl_user_removed', { id: id, reference: response.reference, groupid: response.groupid, groups: response.groups, contractid: response.contractid, dtcreated: NOW });

				// Updates data
				db.modify('tbl_user', { supervisorid: response.supervisorid || null }).where('supervisorid', id);
				db.modify('tbl_user', { deputyid: response.deputyid || null }).where('deputyid', id);

				$.extend(null, function() {
					// Removes data
					db.remove('tbl_user').id(id).callback(function() {
						FUNC.refreshmetadelay();
						EMIT('users/remove', id);
						MAIN.session.refresh(id);
						FUNC.clearcache(id);
						$.success();
					});
					db.log($, null, response.name);
				});

			} else
				$.invalid('error-users-404');
		});
	});

	// Public API for apps
	schema.addWorkflow('public', function($) {

		FUNC.decodetoken($, function(obj) {

			if (!obj.app.allowreadusers) {
				$.invalid('error-permissions');
				return;
			}

			var opt = $.query;

			if (typeof(opt.id) === 'string')
				opt.id = opt.id.split(',');

			if (opt.q)
				opt.q = opt.q.toSearch();

			if (!opt.page)
				opt.page = 1;

			if (!opt.limit)
				opt.limit = 500;

			if (opt.limit > 1000)
				opt.limit = 1000;

			// Removed users
			if (opt.removed) {
				var builder = DBMS().list('tbl_user_removed');
				opt.modified && builder.where('dtcreated', '>', NOW.add('-' + opt.modified));
				builder.paginate(opt.page, opt.limit);
				builder.callback($.callback);
				return;
			}

			if (opt.groups)
				opt.group = opt.groups;

			if (opt.roles)
				opt.role = opt.roles;

			if (opt.directory) {
				// Is number?
				if ((/^\d+$/g).test(opt.directory)) {
					opt.directoryid = +opt.directory;
					opt.directory = null;
				}
			}

			if (opt.modified)
				opt.modified = NOW.add('-' + opt.modified);

			if (opt.logged)
				opt.logged = NOW.add('-' + opt.logged);

			var builder = DBMS().list('tbl_user');

			opt.id && builder.in('id', opt.id);
			opt.statusid && builder.where('statusid', opt.statusid);
			opt.contractid && builder.where('contractid', +opt.contractid);
			opt.directoryid && builder.where('directoryid', opt.directoryid);
			opt.directory && builder.gridfilter('directory', opt, String);
			opt.locality && builder.gridfilter('locality', opt, String);
			opt.language && builder.gridfilter('language', opt, String);
			opt.groupid && builder.gridfilter('groupid', opt, String);
			opt.company && builder.gridfilter('company', opt, String);
			opt.gender && builder.gridfilter('gender', opt, String);
			opt.language && builder.gridfilter('language', opt, String);
			opt.inactive && builder.query('inactive=' + (BOOL[opt.inactive] || 'false'));
			opt.active && builder.query('inactive={0} AND blocked={0}'.format(BOOL[opt.active] || 'false'));
			opt.blocked && builder.query('blocked=' + (BOOL[opt.blocked] || 'false'));
			opt.darkmode && builder.query('darkmode=' + (BOOL[opt.darkmode] || 'false'));
			opt.desktop && builder.gridfilter('desktop', opt, Number);
			opt.sa && builder.query('sa=' + (BOOL[opt.sa] || 'false'));
			opt.otp && builder.query('otp=' + (BOOL[opt.otp] || 'false'));
			opt.online && builder.query('online=' + (BOOL[opt.online] || 'false'));
			opt.q && builder.search('search', opt.q);
			opt.name && builder.gridfilter('name', opt, String);
			opt.firstname && builder.gridfilter('firstname', opt, String);
			opt.lastname && builder.gridfilter('lastname', opt, String);
			opt.middlename && builder.gridfilter('middlename', opt, String);
			opt.phone && builder.gridfilter('phone', opt, String);
			opt.email && builder.gridfilter('email', opt, String);
			opt.group && builder.query('$1=ANY (groups)', [opt.group]);
			opt.modified && builder.where('dtmodified', '>', opt.modified);
			opt.logged && builder.where('dtlogged', '<', opt.logged);

			if (obj.app.allowreadusers > 2)
				builder.query('id IN (SELECT tbl_user_app.userid FROM tbl_user_app WHERE tbl_user_app.appid=\'{0}\')'.format(obj.app.id));

			var fieldstmp = $.query.fields ? $.query.fields.split(',').trim() : null;
			var fields = fieldstmp ? {} : null;

			if (fieldstmp) {
				for (var i = 0; i < fieldstmp.length; i++)
					fields[fieldstmp[i]] = 1;
			}

			builder.fields(fieldsallpublic);
			builder.subquery('appsroles', 'SELECT x.roles FROM tbl_user_app x WHERE x.userid=tbl_user.id AND x.appid=\'{0}\' LIMIT 1'.format(obj.app.id));

			if (opt.sort)
				builder.gridsort(opt.sort);
			else
				builder.sort('dtcreated', true);

			builder.paginate(opt.page, opt.limit);
			builder.callback(function(err, response) {
				for (var i = 0; i < response.items.length; i++)
					response.items[i] = FUNC.makeprofile(response.items[i], obj.app.allowreadusers, obj.app, fields);
				$.callback(response);
			});

			$.extend && $.extend(builder);
		});

	}, 'statusid:Number,contractid:Number,page:Number,limit:Number,statusid:Number');

	schema.addWorkflow('companies', function($) {

		var filter = $.query.q ? ' AND company LIKE $1' : '';
		var params = $.query.q ? ['%' + $.query.q + '%'] : EMPTYARRAY;

		DBMS().query('SELECT company as id, company as name FROM tbl_user WHERE LENGTH(company)>0{0} GROUP BY company LIMIT 5'.format(filter), params).callback($.callback);
	});

	schema.addWorkflow('positions', function($) {

		var filter = $.query.q ? ' AND position LIKE $1' : '';
		var params = $.query.q ? ['%' + $.query.q + '%'] : EMPTYARRAY;

		DBMS().query('SELECT position as id, position as name FROM tbl_user WHERE LENGTH(position)>0{0} GROUP BY position LIMIT 5'.format(filter), params).callback($.callback);
	});

	schema.addWorkflow('locations', function($) {

		var filter = $.query.q ? ' AND locality LIKE $1' : '';
		var params = $.query.q ? ['%' + $.query.q + '%'] : EMPTYARRAY;

		DBMS().query('SELECT locality as id, locality as name FROM tbl_user WHERE LENGTH(locality)>0{0} GROUP BY locality LIMIT 5'.format(filter), params).callback($.callback);
	});

	schema.addWorkflow('groupids', function($) {

		var filter = $.query.q ? ' AND groupid LIKE $1' : '';
		var params = $.query.q ? ['%' + $.query.q + '%'] : EMPTYARRAY;

		DBMS().query('SELECT groupid as id, groupid as name FROM tbl_user WHERE LENGTH(groupid)>0{0} GROUP BY groupid LIMIT 5'.format(filter), params).callback($.callback);
	});

});

function processapps(model, callback) {
	var db = DBMS();
	db.all('tbl_user_app').fields('appid,inherited').where('userid', model.id).callback(function(err, response) {

		var rem = [];
		var tmp = {};

		for (var i = 0; i < model.apps.length; i++) {
			var app = model.apps[i];
			var id = app.id;

			if (!id)
				continue;

			var item = response.findItem('appid', id);
			if (item)
				db.update('tbl_user_app', { roles: app.roles, appid: id, inherited: false, dtupdated: NOW }).id(model.id + id);
			else {
				var appdata = MAIN.apps.findItem('id', id);
				db.insert('tbl_user_app', { id: model.id + id, userid: model.id, appid: id, dtcreated: NOW, inherited: false, roles: app.roles, position: appdata.position || 0 });
			}

			tmp[id] = 1;
		}

		for (var i = 0; i < response.length; i++) {
			var item = response[i];
			if (!item.inherited && !tmp[item.appid])
				rem.push(item.appid);
		}

		rem.length && db.rem('tbl_user_app').where('userid', model.id).in('appid', rem);
		db.callback(callback);
	});
}

FUNC.users_read = function(id, callback) {
	var db = DBMS();

	if (id[0] === '@') {
		// reference
		db.one('tbl_user').where('reference', id.substring(1));
	} else
		db.one('tbl_user').id(id);

	db.err('error-users-404');
	db.all('tbl_user_app').where('userid', db.get('tbl_user.id')).query('inherited=FALSE').fields('appid as id,roles').set('apps');
	db.callback(function(err, response) {

		if (err) {
			callback(err);
			return;
		}

		if (response.ou)
			response.ou = response.ou.join('/');

		delete response.otpsecret;
		delete response.password;
		delete response.verifytoken;
		delete response.accesstoken;
		delete response.pin;

		for (var i = 0; i < response.apps.length; i++) {
			if (!response.apps[i].roles)
				response.apps[i].roles = EMPTYARRAY;
		}

		callback(null, response);
	});
};