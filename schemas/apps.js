const DB_VERSION = {};
const DB_BADGES_RESET = { countbadges: 0 };
const DB_BADGESNOTIFICATIONS_RESET = { countbadges: 0, countnotifications: 0 };
const DB_OPEN = { '+countopen': 1 };
const DB_NOTIFY_RESET = { countnotifications: 0, dtnotified: null };

NEWSCHEMA('Apps', function(schema) {

	schema.define('previd', 'UID')(null); // internal for re-importing of apps

	schema.define('url', 'Url', true);
	schema.define('title', 'String(40)', true);
	schema.define('titles', Object); // localized title
	schema.define('sn', 'String(50)');
	schema.define('permissions', Boolean);
	schema.define('autorefresh', Boolean);
	schema.define('blocked', Boolean);
	schema.define('guest', Boolean);
	schema.define('rebuildaccesstoken', Boolean);
	schema.define('rebuildservicetoken', Boolean);
	schema.define('position', Number);
	schema.define('settings', Object);

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var arr = [];
		for (var i = 0; i < MAIN.apps.length; i++) {
			var app = MAIN.apps[i];
			var obj = {};
			obj.id = app.id;
			obj.name = app.name;
			obj.title = $.user && app.titles ? (app.titles[$.user.language] || app.title) : app.title;
			obj.url = app.url;
			obj.reference = app.reference;
			obj.allowguestuser = app.allowguestuser;
			obj.allowreadusers = app.allowreadusers;
			obj.allowreadapps = app.allowreadapps;
			obj.allownotifications = app.allownotifications;
			obj.allowreadprofile = app.allowreadprofile;
			obj.allowreadmeta = app.allowreadmeta;
			// obj.sn = app.sn;
			obj.roles = app.roles;
			obj.type = app.type;
			obj.position = app.position;
			obj.version = app.version;
			obj.responsive = app.responsive;
			obj.icon = app.icon;
			obj.blocked = app.blocked;
			obj.autorefresh = app.autorefresh;
			obj.description = app.description;
			obj.email = app.email;
			obj.author = app.author;
			obj.online = app.online;
			obj.dtcreated = app.dtcreated;
			obj.dtupdated = app.dtupdated;
			obj.services = !!app.services;
			obj.dtsync = app.dtsync;
			obj.serververify = app.serververify;
			obj.settings = app.settings;
			obj.reference = app.reference;
			obj.workshopid = app.workshopid;
			arr.push(obj);
		}

		$.extend && $.extend(arr);
		$.callback(arr);
	});

	schema.setGet(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var item = MAIN.apps.findItem('id', $.id);
		if (item) {
			var obj = {};
			obj.id = item.id;
			obj.url = item.url;
			obj.name = item.name;
			obj.title = item.title;
			obj.titles = item.titles;
			obj.sn = item.sn;
			obj.blocked = item.blocked;
			obj.autorefresh = item.autorefresh;
			obj.settings = item.settings;
			obj.position = item.position;
			$.extend && $.extend(obj);
			$.callback(obj);
		} else
			$.invalid('error-apps-404');
	});

	schema.addWorkflow('check', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.model;
		var app = MAIN.apps.findItem('url', model.url);
		if (app && app.id !== $.id)
			$.invalid('error-apps-exists');
		else
			$.success();
	});

	schema.addWorkflow('refresh', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.model;
		FUNC.refreshapp(model, $.done(), !model.id || model.permissions);
	});

	schema.setInsert(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.clean();

		if (!model.name) {
			$.invalid('error-apps-offline');
			return;
		}

		model.id = $.controller == null && model.previd ? model.previd : UID();
		model.dtcreated = NOW;
		model.previd = undefined;
		model.permissions = undefined;
		model.rebuildservicetoken = undefined;
		model.rebuildaccesstoken = undefined;
		model.accesstoken = GUID(30);
		model.servicetoken = GUID(15);
		model.linker = model.name.slug(40);
		model.search = (model.name + ' ' + model.title).toSearch().max(40);

		if (!model.services)
			delete model.services;

		if (!model.settings)
			delete model.settings;

		if (!model.titles)
			model.titles = null;

		$.extend && $.extend(model);

		DBMS().insert('tbl_app', model).callback(function(err, response) {
			if (response) {
				FUNC.refreshapps(function() {
					FUNC.log('apps/create', model.id, model.name, $);
					EMIT('apps/create', model.id);
					FUNC.refreshguest();
					FUNC.updateroles($.done());
				});
			} else
				$.invalid(err);
		});
	});

	schema.setUpdate(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.clean();
		model.dtupdated = NOW;

		if (model.rebuildaccesstoken)
			model.accesstoken = GUID(30);

		if (model.rebuildservicetoken)
			model.servicetoken = GUID(15);

		if (!model.titles)
			model.titles = null;

		model.permissions = undefined;
		model.rebuildaccesstoken = undefined;
		model.rebuildservicetoken = undefined;
		model.previd = undefined;
		model.linker = model.name.slug(40);
		model.search = (model.name + ' ' + model.title).toSearch().max(40);

		$.extend && $.extend(model);

		DBMS().modify('tbl_app', model).where('id', $.id).callback(function(err, response) {
			if (response) {
				FUNC.refreshapps(function() {
					FUNC.log('apps/update', $.id, model.name, $);
					EMIT('apps/update', $.id);
					FUNC.refreshguest();
					FUNC.updateroles($.done());
				});
			} else
				$.invalid(err || 'error-apps-404');
		});
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var app = MAIN.apps.findItem('id');
		FUNC.log('apps/remove', $.id, app ? app.name : '', $);

		$.extend && $.extend(app);

		DBMS().remove('tbl_app').where('id', $.id).callback(function() {
			FUNC.refreshapps(function() {
				FUNC.updateroles($.done());
			});
		});
	});

	schema.addWorkflow('meta', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (!$.query.url || !$.query.url.isURL())
			$.invalid('error-invalid-url');
		else
			RESTBuilder.GET($.query.url).exec($.done(true));
	});

	// List of apps for apps
	schema.addWorkflow('public', function($) {
		FUNC.decodetoken($, function(obj) {

			if (!obj.app.allowreadapps)
				return $.invalid('error-permissions');

			var arr = [];
			for (var i = 0; i < MAIN.apps.length; i++) {
				var item = MAIN.apps[i];
				if (!item.workshopid) {
					var app = FUNC.makeapp(item, obj.allowreadapps);
					if (app)
						arr.push(obj);
				}
			}
			$.callback(arr);
		});
	});

	schema.addWorkflow('favorite', function($) {
		var user = $.user;
		var app = user.apps[$.id];
		if (app) {
			app.favorite = app.favorite == null ? true : !app.favorite;
			DBMS().modify('tbl_user_app', { favorite: app.favorite }).where('id', user.id + $.id);
			MAIN.session.set2(user.id, user);
			$.success(true, app.favorite);
		} else
			$.invalid('error-apps-404');
	});

	schema.addWorkflow('run', function($) {

		var user = $.user;
		var data;

		switch ($.id) {
			case '_admin':
			case '_database':
			case '_account':
			case '_welcome':

				if ($.id !== '_account' && $.id !== '_welcome' && !user.sa) {
					$.invalid('error-permissions');
					return;
				}

				data = { datetime: NOW, ip: $.ip, accesstoken: $.id + '-' + user.accesstoken + '-' + user.id + '-' + user.verifytoken, url: $.id === '_welcome' ? CONF.welcome : '/{0}/'.format($.id.substring(1)), settings: null, id: $.id, mobilemenu: $.id !== '_account' && $.id !== '_welcome' && $.id !== '_settings' };
				$.callback(data);
				return;
		}

		var app = MAIN.apps.findItem('id', $.id);
		if (!app) {
			$.invalid('error-apps-404');
			return;
		}

		data = user.guest ? FUNC.metaguest() : FUNC.meta(app, user);
		// FUNC.logger('logs', 'run: ' + app.id + ' (' + app.name + ')', '@' + (user.guest ? 'GUEST' : user.name), $.ip);

		if (data) {

			data.ip = $.ip;
			data.href = $.query.href;

			if (user.guest) {

				data.id = app.id;
				data.url = app.frame;
				data.accesstoken = '0-0-0';

			} else {

				var notifications = user.countnotifications;

				data.notifications = user.apps[$.id].notifications !== false;
				user.countnotifications -= user.apps[$.id].countnotifications;

				if (user.countnotifications < 0)
					user.countnotifications = 0;

				user.apps[$.id].countnotifications = 0;

				if (user.apps[$.id].countbadges || (notifications && !user.countnotifications)) {
					var db = DBMS();
					user.apps[$.id].countbadges && db.modify('tbl_user_app', DB_BADGES_RESET).where('id', $.user.id + $.id);
					if (notifications && !user.countnotifications)
						db.modify('tbl_user', DB_NOTIFY_RESET).where('id', $.user.id);
				}

				user.apps[$.id].countbadges = 0;
				data.newversion = user.apps[$.id].version !== app.version;
				data.version = user.apps[$.id].version || '';

				var db = DBMS();

				if (data.newversion) {
					DB_VERSION.version = app.version;
					user.apps[$.id].version = app.version;
					db.mod('tbl_user_app', DB_VERSION).where('id', user.id + $.id);
				}

				DB_OPEN.dtopen = NOW;
				db.mod('tbl_user_app', DB_OPEN).where('id', user.id + $.id);

				MAIN.session.set2(user.id, user);
			}

			$.callback(data);
		}

	});

	schema.addWorkflow('reset', function($) {

		var user = $.user;

		if (!user.apps[$.id]) {
			$.invalid('error-apps-404');
			return;
		}

		user.apps[$.id].countnotifications = 0;
		user.apps[$.id].countbadges = 0;
		MAIN.session.set2(user.id, user);
		DBMS().modify('tbl_user_app', DB_BADGESNOTIFICATIONS_RESET).where('id', $.user.id + $.id);
		$.success(true);
	});

	schema.addWorkflow('mute', function($) {
		var user = $.user;
		if (user.apps[$.id]) {
			var model = { notifications: (user.apps[$.id].notifications == null || user.apps[$.id].notifications == true) ? false : true };
			DBMS().modify('tbl_user_app', model).where('id', $.user.id + $.id);
			user.apps[$.id].notifications = model.notifications;
			MAIN.session.set2(user.id, user);
			$.success(true, model.notifications);
		} else
			$.invalid('error-apps-404');
	});
});

NEWSCHEMA('Apps/Position', function(schema) {
	schema.define('apps', '[Object]');
	schema.setSave(function($) {
		var user = $.user;
		var apps = $.model.apps;
		var db = DBMS();
		for (var i = 0; i < apps.length; i++) {
			var app = apps[i];
			if (app == null || typeof(app) !== 'object' || app.id[0] === '_')
				continue;
			user.apps[app.id].position = app.position;
			db.modify('tbl_user_app', { position: app.position }).where('id', user.id + app.id);
		}
		db.callback($.done());
	});
});