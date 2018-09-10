const Fs = require('fs');

NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('supervisorid', 'UID');
	schema.define('photo', 'String(30)');
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
	schema.define('reference', 'String(40)');
	schema.define('locality', 'String(40)');
	schema.define('login', 'String(30)');
	schema.define('password', 'String(30)');
	schema.define('roles', '[String]');
	schema.define('groups', '[String]');
	schema.define('blocked', Boolean);
	schema.define('customer', Boolean);
	schema.define('welcome', Boolean);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('volume', Number);
	schema.define('sa', Boolean);
	schema.define('inactive', Boolean);
	schema.define('sounds', Boolean);
	schema.define('rebuildtoken', Boolean);
	schema.define('datebirth', Date);
	schema.define('datebeg', Date);
	schema.define('dateend', Date);
	schema.define('apps', Object); // { "idapp": { roles: [], options: '' } }

	schema.setQuery(function($) {

		var obj = $.query.accesstoken ? OP.decodeAuthToken($.query.accesstoken) : null;

		if (!obj) {
			$.invalid('error-invalid-accesstoken');
			return;
		}

		var user = obj.user;
		var app = obj.app;
		var ip = $.ip;

		if (app.origin) {
			if (!app.origin[ip] && app.hostname !== ip) {
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

		$.callback(OP.users(app, $.query));
	});

	schema.setSave(function($) {

		if ($.user && !$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.model.$clean();
		var item;

		model.welcome = undefined;
		model.search = (model.lastname + ' ' + model.firstname + ' ' + model.email).slug();
		model.name = model.firstname + ' ' + model.lastname;

		if (model.id) {
			// update

			item = G.users.findItem('id', model.id);

			if (item == null) {
				$.invalid('error-users-404');
				return;
			}

			if (model.password && !model.password.startsWith('***'))
				item.password = model.password.sha256();

			item.supervisorid = model.supervisorid;
			item.sa = model.sa;
			item.search = model.search;
			item.blocked = model.blocked;
			item.phone = model.phone;
			item.photo = model.photo;
			item.firstname = model.firstname;
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
			item.dateupdated = NOW;
			item.volume = model.volume;
			item.datebirth = model.datebirth;
			item.datebeg = model.datebeg;
			item.dateend = model.dateend;
			item.inactive = model.inactive;
			item.notificationsphone = model.notificationsphone;
			item.notificationsemail = model.notificationsemail;

			if (model.rebuildtoken || !item.verifytoken)
				item.verifytoken = U.GUID(15);

			if (!item.accesstoken)
				item.accesstoken = U.GUID(40);

			LOGGER('users', 'update: ' + item.id + ' - ' + item.name, '@' + ($.user ? $.user.name : 'root'), $.ip || 'localhost');

		} else {
			item = model;
			item.id = UID();
			item.datecreated = NOW;
			item.password = item.password.sha256();
			item.verifytoken = U.GUID(15);

			if (!item.accesstoken)
				item.accesstoken = U.GUID(40);

			G.users.push(item);
			LOGGER('users', 'create: ' + item.id + ' - ' + item.name, '@' + ($.user ? $.user.name : 'root'), $.ip || 'localhost');
		}

		if (!item.apps)
			item.apps = {};

		item.ougroups = {};

		var ou = item.ou.split('/').trim();
		var oupath = '';

		for (var i = 0; i < ou.length; i++) {
			oupath += (oupath ? '/' : '') + ou[i];
			item.ougroups[oupath] = true;
		}

		item.ou = OP.ou(item.ou);
		item.companylinker = item.company.slug();
		item.localitylinker = item.locality.slug();

		if ($.model.welcome && !model.blocked && !model.inactive) {
			$.model.token = F.encrypt({ id: item.id, date: NOW, type: 'welcome' }, 'token');
			MAIL(model.email, '@(Welcome to OpenPlatform)', '/mails/welcome', $.model, item.language);
		}

		setTimeout2('users', function() {
			$WORKFLOW('User', 'refresh');
			OP.save();
		}, 1000);

		if (item.blocked || item.inactive)
			EMIT('users.refresh', item.id, true);
		else
			EMIT('users.refresh', item);

		$.success();
	});

	schema.setRemove(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var id = $.id;

		G.users = G.users.remove('id', id);

		// Supervisor
		for (var i = 0, length = G.users.length; i < length; i++) {
			var user = G.users[i];
			if (user.supervisorid === id)
				user.supervisorid = '';
		}

		LOGGER('users', 'remove: ' + id, '@' + ($.user ? $.user.name : 'root'), $.ip || 'localhost');
		Fs.unlink(F.path.databases('notifications_' + user.id + '.json'), NOOP);

		setTimeout2('users', function() {
			$WORKFLOW('User', 'refresh');
			OP.save();
		}, 1000);

		EMIT('users.refresh', id, true);
		$.success();
	});

	schema.addWorkflow('refresh', function($) {

		var ou = {};
		var localities = {};
		var companies = {};
		var customers = {};
		var groups = {};
		var roles = {};

		var toArray = function(obj, preparator) {
			var arr = Object.keys(obj);
			var output = [];
			for (var i = 0, length = arr.length; i < length; i++)
				output.push(preparator ? preparator(obj[arr[i]]) : obj[arr[i]]);
			output.quicksort('name');
			return output;
		};

		for (var i = 0, length = G.users.length; i < length; i++) {

			var item = G.users[i];
			var ougroups = item.ougroups ? Object.keys(item.ougroups) : EMPTYARRAY;

			for (var j = 0; j < ougroups.length; j++) {
				var oukey = ougroups[j];
				if (ou[oukey])
					ou[oukey].count++;
				else
					ou[oukey] = { count: 1, name: oukey };
			}

			for (var j = 0; j < item.groups.length; j++) {
				var g = item.groups[j];
				if (groups[g])
					groups[g].count++;
				else
					groups[g] = { count: 1, id: g, name: g };
			}

			for (var j = 0; j < item.roles.length; j++) {
				var r = item.roles[j];
				if (roles[r])
					roles[r].count++;
				else
					roles[r] = { count: 1, id: r, name: r };
			}

			if (item.locality) {
				if (localities[item.locality])
					localities[item.locality].count++;
				else
					localities[item.locality] = { count: 1, id: item.locality.slug(), name: item.locality };
			}

			if (item.company) {

				if (item.customer) {
					if (customers[item.company])
						customers[item.company].count++;
					else
						customers[item.company] = { count: 1, id: item.company.slug(), name: item.company };
				}

				if (companies[item.company])
					companies[item.company].count++;
				else
					companies[item.company] = { count: 1, id: item.company.slug(), name: item.company };
			}
		}

		var meta = G.meta = {};
		meta.companies = toArray(companies);
		meta.customers = toArray(customers);
		meta.localities = toArray(localities);
		meta.groups = toArray(groups);
		meta.roles = toArray(roles);
		meta.languages = F.config.languages;

		meta.ou = toArray(ou, function(item) {
			item.name = item.name.replace(/\//g, ' / ');
			return item;
		});

		EMIT('users.meta', meta);
		$.callback(meta);
	});
});