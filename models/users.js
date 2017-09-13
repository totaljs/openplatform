const Fs = require('fs');

NEWSCHEMA('User').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('idsupervisor', 'UID');
	schema.define('photo', 'String(30)');
	schema.define('name', 'String(40)');
	schema.define('firstname', 'Capitalize(40)', true);
	schema.define('lastname', 'Capitalize(40)', true);
	schema.define('gender', ['male', 'female'], true);
	schema.define('email', 'Email', true);
	schema.define('accesstoken', 'String(50)');
	schema.define('phone', 'Phone');
	schema.define('company', 'String(40)');
	schema.define('department', 'String(40)');
	schema.define('group', 'String(40)');
	schema.define('language', 'String(2)');
	schema.define('reference', 'String(40)');
	schema.define('place', 'String(40)');
	schema.define('position', 'String(40)');
	schema.define('login', 'String(30)');
	schema.define('password', 'String(30)');
	schema.define('roles', '[String]');
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
	schema.define('verifytoken', Boolean);
	schema.define('datebirth', Date);
	schema.define('datestart', Date);
	schema.define('dateend', Date);
	schema.define('apps', Object); // { "idapp": { roles: [], options: '' } }

	schema.setSave(function($) {

		if (!$.controller.user.sa) {
			$.error.push('error-permissions');
			return $.callback();
		}

		var model = $.model.$clean();
		var item;

		model.welcome = undefined;
		model.search = (model.lastname + ' ' + model.firstname + ' ' + model.email).slug();
		model.name = model.firstname + ' ' + model.lastname;

		if (model.id) {
			// update

			item = F.global.users.findItem('id', model.id);

			if (item == null) {
				$.error.push('error-user-404');
				$.callback();
				return;
			}

			if (model.password && !model.password.startsWith('***'))
				item.password = model.password.sha256();

			item.idsupervisor = model.idsupervisor;
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
			item.department = model.department;
			item.group = model.group;
			item.language = model.language;
			item.place = model.place;
			item.position = model.position;
			item.login = model.login;
			item.roles = model.roles;
			item.customer = model.customer;
			item.notifications = model.notifications;
			item.sounds = model.sounds;
			item.apps = model.apps;
			item.dateupdated = F.datetime;
			item.volume = model.volume;
			item.datebirth = model.datebirth;
			item.datestart = model.datestart;
			item.dateend = model.dateend;
			item.inactive = model.inactive;
			item.notificationsphone = model.notificationsphone;
			item.notificationsemail = model.notificationsemail;

			if (model.verifytoken)
				item.verifytoken = U.GUID(15);

		} else {
			item = model;
			item.id = UID();
			item.datecreated = F.datetime;
			item.password = item.password.sha256();
			item.verifytoken = U.GUID(15);
			F.global.users.push(item);
		}

		item.grouplinker = item.group.slug();
		item.departmentlinker = item.department.slug();
		item.companylinker = item.company.slug();
		item.placelinker = item.place.slug();
		item.positionlinker = item.position.slug();

		if ($.model.welcome && !model.blocked && !model.inactive) {
			$.model.token = F.encrypt({ id: item.id, date: F.datetime, type: 'welcome' }, 'token');
			F.mail(model.email, '@(Welcome to OpenPlatform)', '/mails/welcome', $.model, item.language);
		}

		$WORKFLOW('User', 'refresh');
		EMIT('users.refresh', item);
		OP.save();
		$.callback(SUCCESS(true));
	});

	schema.setRemove(function($) {

		if (!$.controller.user.sa) {
			$.error.push('error-permissions');
			return $.callback();
		}

		var id = $.controller.id;

		F.global.users = F.global.users.remove('id', id);

		// Supervisor
		for (var i = 0, length = F.global.users.length; i < length; i++) {
			var user = F.global.users[i];
			if (user.idsupervisor === id)
				user.idsupervisor = '';
		}

		Fs.unlink(F.path.databases('notifications_' + user.id + '.json'), NOOP);
		OP.save(); // Save changes
		EMIT('users.refresh', id, true);
		$.callback(SUCCESS(true));
	});

	schema.addWorkflow('refresh', function($) {

		var groups = {};
		var departments = {};
		var places = {};
		var companies = {};
		var positions = {};
		var customers = {};

		var toArray = function(obj) {
			var arr = Object.keys(obj);
			var output = [];
			for (var i = 0, length = arr.length; i < length; i++)
				output.push(obj[arr[i]]);
			output.quicksort('name');
			return output;
		};

		for (var i = 0, length = F.global.users.length; i < length; i++) {
			var item = F.global.users[i];

			if (item.group) {
				if (groups[item.group])
					groups[item.group].count++;
				else
					groups[item.group] = { count: 1, id: item.group.slug(), name: item.group };
			}

			if (item.department) {
				if (departments[item.department])
					departments[item.department].count++;
				else
					departments[item.department] = { count: 1, id: item.department.slug(), name: item.department };
			}

			if (item.place) {
				if (places[item.place])
					places[item.place].count++;
				else
					places[item.place] = { count: 1, id: item.place.slug(), name: item.place };
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

			if (item.position) {
				if (positions[item.position])
					positions[item.position].count++;
				else
					positions[item.position] = { count: 1, id: item.position.slug(), name: item.position };
			}
		}

		var meta = F.global.meta = {};
		meta.companies = toArray(companies);
		meta.customers = toArray(customers);
		meta.departments = toArray(departments);
		meta.groups = toArray(groups);
		meta.places = toArray(places);
		meta.positions = toArray(positions);
		meta.languages = F.config.languages;

		EMIT('users.meta', meta);
		$.callback(meta);
	});
});