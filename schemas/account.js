const Fs = require('fs');
var DDOS = {};

NEWSCHEMA('Account', function(schema) {

	schema.encrypt && schema.encrypt();
	schema.compress && schema.compress();

	schema.define('email', 'Email', true);
	schema.define('notifications', Boolean);
	schema.define('notificationsemail', Boolean);
	schema.define('notificationsphone', Boolean);
	schema.define('password', 'String(100)');
	schema.define('name', 'String(50)');
	schema.define('status', 'String(70)');
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

	schema.setRead(function($) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		var builder = DBMS().read('tbl_user');
		builder.error('error-users-404');
		builder.fields('name,status,email,notifications,notificationsemail,notificationsphone,phone,photo,darkmode,sounds,volume,language,colorscheme,desktop,background,otp,locking,dateformat,timeformat,numberformat,checksum');
		builder.id($.user.id);
		builder.callback($.callback);
		$.extend && $.extend(builder);
	});

	schema.addWorkflow('check', function($, model) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		if (!$.model.email)
			return $.success();

		var db = DBMS();
		db.check('tbl_user').query('email=$1 AND id<>$2', [model.email, $.user.id]);
		db.err('error-users-email', true);
		db.callback($.done());
	});

	schema.setSave(function($, model) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		var user = $.user;
		var path;

		// Removing older background
		if (user.background && user.background !== CONF.background && model.background !== user.background) {
			path = 'backgrounds/' + user.background;
			Fs.unlink(PATH.public(path), NOOP);
			TOUCH('/' + path);
			user.background = model.background;
		}

		var isoauth = $.user.checksum === 'oauth2';
		var isldap = !!$.user.dn;

		if (CONF.allownickname && model.name && !isoauth) {
			var name = FUNC.nicknamesanitize(model.name);
			if (name) {
				user.name = model.name = name;
				modified = true;
			} else
				model.name = undefined;
		} else
			model.name = undefined;

		if (!isoauth && !isldap && model.password && !model.password.startsWith('***')) {
			user.password = model.password = model.password.hash(CONF.hashmode || 'sha256', CONF.hashsalt);
			model.dtpassword = NOW;
			user.dtpassword = NOW;
		} else
			model.password = undefined;

		if (isoauth) {
			model.otpsecret = undefined;
			model.opt = undefined;
		} else {
			if (!model.otp)
				model.otpsecret = null;
			else if (!model.otpsecret)
				model.otpsecret = undefined;
		}

		var modified = false;

		if (!isoauth && user.email !== model.email) {
			user.email = model.email;
			modified = true;
		} else
			model.email = undefined;

		if (user.status !== model.status)
			user.status = model.status;
		else
			model.status = undefined;

		if (user.notifications !== model.notifications) {
			user.notifications = model.notifications;
			modified = true;
		}

		user.notificationsphone = model.notificationsphone;

		if (user.notificationsemail !== model.notificationsemail) {
			user.notificationsemail = model.notificationsemail;
			modified = true;
		}

		if (!isoauth && user.phone !== model.phone) {
			user.phone = model.phone;
			modified = true;
		} else
			model.phone = undefined;

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
			model.dtmodified = user.dtmodified = NOW;
			keys.push('dtmodified');
		}

		if (model.pin && model.pin.length === 4 && model.pin && model.pin != '0000')
			model.pin = user.pin = model.pin.hash(CONF.hashmode || 'sha256', CONF.hashsalt).hash(true) + '';
		else
			model.pin = undefined;

		$.extend && $.extend(model);

		var db = DBMS();
		db.modify('tbl_user', model).id($.user.id).error('error-users-404').done($, function() {
			user.rev = GUID(5);
			MAIN.session.refresh(user.id, $.sessionid);
			EMIT('users/update', user.id, 'account');
			$.success();
		});
		db.log($, model);
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
			delete DDOS[id];
			FUNC.logout($.controller);
			return;
		}

		var pin = pin.hash(CONF.hashmode || 'sha256', CONF.hashsalt).hash(true) + '';
		if ($.user.pin !== pin) {
			$.invalid('error-pin');
			return;
		}

		var db = DBMS();

		db.mod('tbl_user_session', { locked: false }).id($.sessionid).done($, function() {
			$.user.locked = false;
			$.user.dtlogged2 = NOW;
			delete DDOS[id];
			$.success();
		});

		db.log($);
	});

	schema.addWorkflow('current', function($) {
		FUNC.profile($.user, function(err, data) {
			data && (data.ip = $.ip);
			data.config = { allowdesktopfluid: CONF.allowdesktopfluid, name: CONF.name, allowstatus: CONF.allowstatus, welcome: CONF.welcome, allowprofile: CONF.allowprofile, allowmembers: CONF.allowmembers, maxmembers: CONF.maxmembers };
			$.callback(data);
		});
	});

	schema.addWorkflow('live', function($) {
		var running = $.query.running;

		if ($.user.running !== running) {
			$.user.running = running;
			DBMS().modify('tbl_user', { running: (running || '').split(',').trim() }).id($.user.id);
		}

		$.user.ping = NOW;
		$.callback(FUNC.profilelive($.user));
	});

});

ON('service', function(counter) {
	if (counter % 60 === 0)
		DDOS = {};
});