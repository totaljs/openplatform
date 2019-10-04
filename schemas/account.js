const Fs = require('fs');
var DDOS = {};

NEWSCHEMA('Account', function(schema) {

	schema.define('email', 'Email', true);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('password', 'String(100)');
	schema.define('phone', 'Phone');
	schema.define('photo', 'String(50)');
	schema.define('sounds', Boolean);
	schema.define('darkmode', Boolean);
	schema.define('dateformat', ['yyyy-MM-dd', 'dd.MM.yyyy', 'MM.dd.yyyy']); // date format
	schema.define('timeformat', [12, 24]); // 12 or 24
	schema.define('numberformat', [1, 2, 3, 4]); // 1: "1 000.10", 2: "1 000,10", 3: "100,000.00", 4: "100.000,00"
	schema.define('volume', Number);
	schema.define('desktop', [1, 2, 3]);
	schema.define('otp', Boolean);
	schema.define('otpsecret', 'String(80)');
	schema.define('language', 'Lower(2)');
	schema.define('pin', 'String(4)'); // Unlock pin
	schema.define('locking', Number); // in minutes (0: disabled)
	schema.define('colorscheme', 'Lower(7)');
	schema.define('background', 'String(150)');

	schema.setGet(function($) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		DBMS().read('tbl_user').error('error-users-404').fields('email,notifications,notificationsemail,notificationsphone,phone,photo,darkmode,sounds,volume,language,colorscheme,desktop,background,otp,locking,dateformat,timeformat,numberformat').where('id', $.user.id).callback($.callback);
	});


	schema.addWorkflow('check', function($) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		if (!$.model.email)
			return $.success();

		var db = DBMS();
		db.check('tbl_user').query('email=$1 AND id<>$2', [$.model.email, $.user.id]);
		db.err('error-users-email', true);
		db.callback($.done());
	});

	schema.setSave(function($) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();
		var user = $.user;
		var path;

		// Removing older background
		if (user.background && user.background !== CONF.background && model.background !== user.background) {
			path = 'backgrounds/' + model.background;
			Fs.unlink(PATH.public(path), NOOP);
			F.touch('/' + path);
		}

		// Removing older photo
		if (user.photo && model.photo !== user.photo) {
			path = 'photos/' + user.photo;
			// @TODO: removing photo must be posponed
			Fs.unlink(PATH.public(path), NOOP);
			F.touch('/' + path);
		}

		if (model.password && !model.password.startsWith('***')) {
			user.password = model.password = model.password.sha256();
			model.dtpassword = NOW;
			user.dtpassword = NOW;
		} else
			model.password = undefined;

		if (!model.otp)
			model.otpsecret = null;
		else if (!model.otpsecret)
			model.otpsecret = undefined;

		var modified = false;

		if (user.email !== model.email) {
			user.email = model.email;
			modified = true;
		}

		user.notifications = model.notifications;
		user.notificationsemail = model.notificationsemail;
		user.notificationsphone = model.notificationsphone;

		if (user.phone !== model.phone) {
			user.phone = model.phone;
			modified = true;
		}

		user.darkmode = model.darkmode;

		if (user.photo !== model.photo) {
			user.photo = model.photo;
			modified = true;
		}

		if (user.language !== model.language) {
			user.language = model.language;
			modified = true;
		}

		user.sounds = model.sounds;
		user.volume = model.volume;
		user.colorscheme = model.colorscheme || CONF.colorscheme || '#4285f4';
		user.background = model.background;
		user.dtupdated = NOW;
		user.locking = model.locking;
		user.desktop = model.desktop;

		var tmp = model.dateformat || 'yyyy-MM-dd';

		if (user.dateformat !== tmp) {
			user.dateformat = tmp;
			modified = true;
		}

		tmp = model.timeformat || 24;
		if (user.timeformat !== tmp) {
			user.timeformat = model.timeformat;
			modified = true;
		}

		tmp = model.numberformat || 1;

		if (user.numberformat !== tmp) {
			user.numberformat = model.numberformat;
			modified = true;
		}

		var keys = Object.keys(model);

		if (modified) {
			user.dtmodified = NOW;
			keys.push('dtmodified');
		}

		if (model.pin && model.pin.length === 4 && model.pin && model.pin != '0000')
			user.pin = model.pin.sha256().hash() + '';

		DBMS().modify('tbl_user', model).where('id', $.user.id).error('error-users-404').callback(function(err, response) {
			if (response) {
				MAIN.session.update2($.user.id, user);
				FUNC.log('account/update', $.user.id, 'Updated account: ' + $.user.name, $);
				EMIT('users/update', user.id, 'account');
				$.success();
			} else
				$.invalid(err);
		});
	});

	schema.addWorkflow('unlock', function($) {

		if (!$.user) {
			$.invalid('error-offline');
			return;
		}

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		if (!$.controller.req.locked) {
			$.success();
			return;
		}

		var pin = $.query.pin || '0000';
		var id = $.user.id;

		if (DDOS[id])
			DDOS[id]++;
		else
			DDOS[id] = 1;

		if (DDOS[id] > 4) {
			FUNC.logout($.controller);
			return;
		}

		var pin = pin.sha256().hash() + '';
		if ($.user.pin !== pin) {
			$.invalid('error-pin');
			return;
		}

		FUNC.log('account/unlock', $.user.id, 'Unlock screen', $);

		MAIN.session.get($.sessionid, function(err, profile, meta) {
			meta.settings = (meta.settings || '').replace('locked:1', 'locked:0');
			var expire = CONF.cookie_expiration || '3 days';
			MAIN.session.set($.sessionid, profile.id, profile, expire, meta.note, meta.settings, $.done());
			delete DDOS[id];
		});
	});
});

ON('service', function(counter) {
	if (counter % 60 === 0)
		DDOS = {};
});