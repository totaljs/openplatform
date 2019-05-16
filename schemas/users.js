MAIN.fields = ['id', 'supervisorid', 'deputyid', 'groupid', 'directory', 'directoryid', 'statusid', 'status', 'name', 'firstname', 'lastname', 'gender', 'email', 'phone', 'company', 'ou', 'language', 'reference', 'position', 'locality', 'login', 'password', 'locking', 'roles', 'groups', 'colorscheme', 'background', 'blocked', 'customer', 'darkmode', 'notifications', 'notificationsemail', 'notificationsphone', 'dateformat', 'timeformat', 'numberformat', 'volume', 'sa', 'inactive', 'sounds', 'dtbirth', 'dtbeg', 'dtend', 'dtcreated', 'dtmodified', 'dtupdated', 'dtnofified', 'apps', 'verifytoken', 'accesstoken', 'pin', 'search', 'linker', 'ougroups', 'repo', 'online', 'photo', 'countbadges', 'countnotifications'];

NEWSCHEMA('User', function(schema) {

	schema.define('id', 'UID');
	schema.define('supervisorid', 'UID');
	schema.define('deputyid', 'UID');
	schema.define('groupid', 'String(30)');
	schema.define('directory', 'Lower(25)');
	schema.define('photo', 'String(150)');
	schema.define('statusid', Number);
	schema.define('status', 'String(70)');
	// schema.define('name', 'String(40)');
	schema.define('firstname', 'Capitalize(40)', true);
	schema.define('lastname', 'Capitalize(40)', true);
	schema.define('gender', ['male', 'female'], true);
	schema.define('email', 'Email', true);
	schema.define('phone', 'Phone');
	schema.define('company', 'String(40)');
	schema.define('ou', 'String(100)');
	schema.define('language', 'Lower(2)');
	schema.define('reference', 'String(100)');
	schema.define('position', 'String(40)');
	schema.define('locality', 'String(40)');
	schema.define('login', 'String(120)');

	// This can be used in Account scheme:
	// schema.define('pin', 'String(4)'); // PIN for unlocking

	schema.define('locking', Number); // in minutes (0 = disabled)
	schema.define('password', 'String(30)');
	schema.define('roles', '[String]');
	schema.define('groups', '[String]');
	schema.define('colorscheme', 'Lower(7)');
	schema.define('background', 'String(150)');
	schema.define('blocked', Boolean);
	schema.define('customer', Boolean);
	schema.define('welcome', Boolean);
	schema.define('darkmode', Boolean);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('dateformat', ['yyyy-MM-dd', 'dd.MM.yyyy', 'MM.dd.yyyy']); // date format
	schema.define('timeformat', [12, 24]); // 12 or 24
	schema.define('numberformat', [1, 2, 3, 4]); // 1: "1 000.10", 2: "1 000,10", 3: "100,000.00", 4: "100.000,00"
	schema.define('volume', Number);
	schema.define('sa', Boolean);
	schema.define('inactive', Boolean);
	schema.define('sounds', Boolean);
	schema.define('rebuildtoken', Boolean);
	schema.define('rebuildaccesstoken', Boolean);
	schema.define('dtbirth', Date);
	schema.define('dtbeg', Date);
	schema.define('dtend', Date);
	schema.define('apps', Object); // { "appid": { roles: [], options: '', favorite: false } }

	schema.setQuery(function($) {
		OP.decodeAuthToken($.query.accesstoken || '', function(err, obj) {

			if (!obj) {
				$.invalid('error-invalid-accesstoken');
				return;
			}

			var user = obj.user;
			var app = obj.app;
			var ip = $.ip;

			if (app.origin) {
				if (app.origin.indexOf(ip) == -1 && app.hostname !== ip) {
					$.invalid('error-invalid-origin');
					return;
				}
			} else if (app.hostname !== ip && (!$.user || $.user.id !== user.id)) {
				$.invalid('error-invalid-origin');
				return;
			} else if (user.blocked || user.inactive) {
				$.invalid('error-permissions');
				return;
			}

			if (!user.apps[app.id]) {
				$.invalid('error-permissions');
				return;
			}

			if (user.directory) {
				if (!user.sa || !$.query.all)
					$.query.directory = user.directory;
			}

			OP.users(app, $.query, $.callback);
		});
	});

	function isdatemodified(dt1, dt2) {
		if (dt1 instanceof Date && dt2 instanceof Date)
			return dt1.getTime() !== dt2.getTime();
		return dt1 === dt2;
	}

	schema.setSave(function($) {

		if ($.user && !$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();
		var item;
		var rebuildaccesstoken = model.rebuildaccesstoken;
		var rebuildtoken = model.rebuildtoken;

		delete model.rebuildaccesstoken;
		delete model.rebuildtoken;
		delete model.welcome;

		model.search = (model.lastname + ' ' + model.firstname + ' ' + model.email).toSearch();
		model.name = (model.firstname + ' ' + model.lastname).max(40);
		model.linker = model.name.slug();

		var prepare = function(item, model) {

			!item.apps && (item.apps = {});
			item.ougroups = {};

			var ou = item.ou.split('/').trim();
			var oupath = '';

			for (var i = 0; i < ou.length; i++) {
				oupath += (oupath ? '/' : '') + ou[i];
				item.ougroups[oupath] = true;
			}

			item.ougroups = Object.keys(item.ougroups);
			item.ou = OP.ou(item.ou);
			item.linker = item.name.slug();

			if ($.model.welcome && !model.blocked && !model.inactive) {
				$.model.token = F.encrypt({ id: item.id, date: NOW, type: 'welcome' }, 'token');
				MAIL(model.email, '@(Welcome to OpenPlatform)', '/mails/welcome', $.model, item.language);
			}
		};

		if (model.id) {

			FUNC.users.get(model.id, function(err, item) {

				if (item == null) {
					$.invalid('error-users-404');
					return;
				}

				if ($.user && $.user.directory && item.directory !== $.user.directory) {
					$.invalid('error-permissions');
					return;
				}

				if (model.password && !model.password.startsWith('***'))
					item.password = model.password.sha256();

				var modified = false;

				if (item.supervisorid !== model.supervisorid) {
					item.supervisorid = model.supervisorid;
					modified = true;
				}

				if (item.deputyid !== model.deputyid) {
					item.deputyid = model.deputyid;
					modified = true;
				}

				if (item.sa !== model.sa) {
					item.sa = model.sa;
					modified = true;
				}

				item.search = model.search;

				if (item.blocked !== model.blocked) {
					item.blocked = model.blocked;
					modified = true;
				}

				if (item.phone !== model.phone) {
					item.phone = model.phone;
					modified = true;
				}

				if (item.photo !== model.photo) {
					item.photo = model.photo;
					modified = true;
				}

				if (item.statusid !== model.statusid) {
					item.statusid = model.statusid;
					modified = true;
				}

				if (item.status !== model.status) {
					item.status = model.status;
					modified = true;
				}

				item.locking = model.locking;

				if (item.firstname !== model.firstname) {
					item.firstname = model.firstname;
					modified = true;
				}

				if (item.lastname !== model.lastname) {
					item.lastname = model.lastname;
					modified = true;
				}

				if (item.directory !== model.directory) {
					item.directory = model.directory;
					item.directoryid = item.directory ? item.directory.crc32(true) : 0;
					modified = true;
				}

				if (item.email !== model.email) {
					item.email = model.email;
					modified = true;
				}

				if (item.name !== model.name) {
					item.name = model.name;
					modified = true;
				}

				if (item.company !== model.company) {
					item.company = model.company;
					modified = true;
				}

				if (item.gender !== model.gender) {
					item.gender = model.gender;
					modified = true;
				}

				if (item.ou !== model.ou) {
					item.ou = model.ou;
					modified = true;
				}

				item.groups = model.groups;
				item.roles = model.roles;

				if (item.language !== model.language) {
					item.language = model.language;
					modified = true;
				}

				if (item.locality !== model.locality) {
					item.locality = model.locality;
					modified = true;
				}

				if (item.position !== model.position) {
					item.position = model.position;
					modified = true;
				}

				item.login = model.login;

				if (item.customer !== model.customer) {
					item.customer = model.customer;
					modified = true;
				}

				item.notifications = model.notifications;
				item.sounds = model.sounds;

				var apps = Object.keys(model.apps);

				for (var i = 0; i < apps.length; i++) {
					var key = apps[i];
					var app = model.apps[key];
					var appold = item.apps[key];
					if (appold) {
						app.favorite = appold.favorite;
						app.countnotifications = appold.countnotifications;
						app.countbadges = appold.countbadges;
					}
					app.id = key;
				}

				item.apps = model.apps;
				item.dtupdated = NOW;
				item.volume = model.volume;

				if (isdatemodified(item.dtbirth, model.dtbirth)) {
					item.dtbirth = model.dtbirth;
					modified = true;
				}

				if (isdatemodified(item.dtbeg, model.dtbeg)) {
					item.dtbeg = model.dtbeg;
					modified = true;
				}

				if (isdatemodified(item.dtend, model.dtend)) {
					item.dtend = model.dtend;
					modified = true;
				}

				if (item.inactive != model.inactive) {
					item.inactive = model.inactive;
					modified = true;
				}

				item.notificationsphone = model.notificationsphone;
				item.notificationsemail = model.notificationsemail;
				item.darkmode = model.darkmode;

				var tmp = model.dateformat || 'yyyy-MM-dd';
				if (item.dateformat !== tmp) {
					item.dateformat = tmp;
					modified = true;
				}

				tmp = model.timeformat || 24;

				if (item.timeformat !== tmp) {
					item.timeformat = tmp;
					modified = true;
				}

				tmp = model.numberformat || 1;

				if (item.numberformat !== tmp) {
					item.numberformat = tmp;
					modified = true;
				}

				// item.pin = model.pin;

				if (rebuildtoken || !item.verifytoken)
					item.verifytoken = U.GUID(15);

				if (rebuildaccesstoken || !item.accesstoken)
					item.accesstoken = GUID(40);

				if (modified)
					item.dtmodified = NOW;

				prepare(item, $.model);

				FUNC.users.set(item, null, function() {
					FUNC.users.meta();
					FUNC.emit('users.meta');
					FUNC.emit('users.update', item.id);
					FUNC.emit('users.refresh', item.id, item.blocked || item.inactive ? true : undefined);
					FUNC.logger('users', 'update: ' + item.id + ' - ' + item.name, '@' + ($.user ? $.user.name : 'root'), $.ip || 'localhost');
					$.success();
				});
			});

		} else {

			item = model;
			item.dtcreated = NOW;
			item.password = item.password.sha256();
			item.verifytoken = U.GUID(15);
			item.accesstoken = U.GUID(40);

			if ($.user && $.user.directory) {
				item.directory = $.user.directory;
				item.directoryid = item.directory.crc32(true);
			} else
				item.directoryid = 0;

			var apps = Object.keys(model.apps);

			for (var i = 0; i < apps.length; i++) {
				var key = apps[i];
				var app = model.apps[key];
				app.id = key;
			}

			prepare(item, $.model);
			FUNC.users.set(item, null, function(err, id) {
				FUNC.users.meta();
				FUNC.emit('users.meta');
				FUNC.emit('users.create', id);
				FUNC.emit('users.refresh', id, item.blocked || item.inactive ? true : undefined);
				FUNC.logger('users', 'create: ' + id + ' - ' + item.name, '@' + ($.user ? $.user.name : 'root'), $.ip || 'localhost');
				$.success();
			});
		}
	});

	schema.setRemove(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var id = $.id;
		FUNC.users.rem(id, function(err, item) {
			if (item) {
				FUNC.users.meta();
				FUNC.emit('users.meta');
				FUNC.emit('users.remove', id);
				FUNC.emit('users.refresh', id, true);
				FUNC.logger('users', 'remove: ' + id, '@' + ($.user ? $.user.name : 'root'), $.ip || 'localhost');
			}
			$.success();

		});
	});
});