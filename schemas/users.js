NEWSCHEMA('User', function(schema) {

	schema.define('id', 'UID');
	schema.define('supervisorid', 'UID');
	schema.define('deputyid', 'UID');
	schema.define('directory', 'Lower(25)');
	schema.define('photo', 'String(150)');
	schema.define('statusid', Number);
	schema.define('status', 'String(70)');
	schema.define('name', 'String(40)');
	schema.define('firstname', 'Capitalize(40)', true);
	schema.define('lastname', 'Capitalize(40)', true);
	schema.define('gender', ['male', 'female'], true);
	schema.define('email', 'Email', true);
	schema.define('accesstoken', 'String(50)');
	schema.define('phone', 'Phone');
	schema.define('company', 'String(40)');
	schema.define('ou', 'String(100)');
	schema.define('language', 'String(2)');
	schema.define('reference', 'String(100)');
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
	schema.define('dateformat', 'String(20)'); // date format
	schema.define('timeformat', Number); // 12 or 24
	schema.define('volume', Number);
	schema.define('sa', Boolean);
	schema.define('inactive', Boolean);
	schema.define('sounds', Boolean);
	schema.define('rebuildtoken', Boolean);
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

	schema.setSave(function($) {

		if ($.user && !$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();
		var item;

		model.welcome = undefined;
		model.search = (model.lastname + ' ' + model.firstname + ' ' + model.email).toSearch();
		model.name = model.firstname + ' ' + model.lastname;
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

				item.supervisorid = model.supervisorid;
				item.deputyid = model.deputyid;
				item.sa = model.sa;
				item.search = model.search;
				item.blocked = model.blocked;
				item.phone = model.phone;
				item.photo = model.photo;
				item.statusid = model.statusid;
				// item.pin = model.pin;
				item.locking = model.locking;
				item.status = model.status;
				item.firstname = model.firstname;
				item.directory = model.directory;
				item.directoryid = item.directory ? item.directory.crc32(true) : 0;
				item.lastname = model.lastname;
				item.email = model.email;
				item.name = model.name;
				item.accesstoken = model.accesstoken;
				item.company = model.company;
				item.gender = model.gender;
				item.ou = model.ou;
				item.groups = model.groups;
				item.language = model.language;
				item.locality = model.locality;
				item.login = model.login;
				item.roles = model.roles;
				item.customer = model.customer;
				item.notifications = model.notifications;
				item.sounds = model.sounds;
				item.apps = model.apps;
				item.dtupdated = NOW;
				item.volume = model.volume;
				item.dtbirth = model.dtbirth;
				item.dtbeg = model.dtbeg;
				item.dtend = model.dtend;
				item.inactive = model.inactive;
				item.notificationsphone = model.notificationsphone;
				item.notificationsemail = model.notificationsemail;
				item.darkmode = model.darkmode;
				item.dateformat = model.dateformat || 'yyyy-MM-dd';
				item.timeformat = model.timeformat || 24;

				if (model.rebuildtoken || !item.verifytoken)
					item.verifytoken = U.GUID(15);

				if (!item.accesstoken)
					item.accesstoken = U.GUID(40);

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

			if ($.user && $.user.directory) {
				item.directory = $.user.directory;
				item.directoryid = item.directory.crc32(true);
			} else
				item.directoryid = 0;

			if (!item.accesstoken)
				item.accesstoken = U.GUID(40);

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