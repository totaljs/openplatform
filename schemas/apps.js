const DB_RESET = { countbadges: 0, countnotifications: 0 };
var USAGE_STATS = [];

NEWSCHEMA('Apps', function(schema) {

	schema.define('previd', 'UID')(null); // internal for re-importing of apps
	// schema.define('typeid', ['external', 'designer'])('external');
	schema.define('typeid', ['external'])('external');
	schema.define('url', 'Url', true);
	schema.define('title', 'String(40)', true);
	schema.define('titles', Object); // localized title
	schema.define('sn', 'String(50)');
	schema.define('origintoken', 'String(50)');
	schema.define('permissions', Boolean);
	schema.define('autorefresh', Boolean);
	schema.define('blocked', Boolean);
	schema.define('guest', Boolean);
	schema.define('rebuildaccesstoken', Boolean);
	schema.define('rebuildservicetoken', Boolean);
	schema.define('position', Number);
	schema.define('settings', Object);
	schema.define('icon', 'String(30)');
	schema.define('color', 'Upper(7)');
	schema.define('roles', '[String]');
	schema.define('origin', '[String]');
	schema.define('version', 'String(10)');

	schema.define('allowguestuser', Boolean);
	schema.define('allownotifications', Boolean);
	schema.define('allowreadusers', Number);
	schema.define('allowreadprofile', Number);
	schema.define('allowreadmeta', Boolean);

	// schema.required('url', (model) => model.typeid === 'external');

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var isadminarea = $.req && $.req.uri && $.req.uri.pathname ? $.req.uri.pathname.indexOf('/opapi/') !== -1 : false;
		var arr = [];
		for (var i = 0; i < MAIN.apps.length; i++) {
			var app = MAIN.apps[i];
			var obj = {};
			obj.id = app.id;
			obj.typeid = app.typeid;
			obj.name = app.name;
			obj.title = $.user && app.titles ? (app.titles[$.user.language] || app.title) : app.title;
			obj.url = app.url;

			if (isadminarea)
				obj.accesstoken = app.accesstoken;

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
			obj.count = 0;
			arr.push(obj);
		}

		$.extend && $.extend(arr);
		$.callback(arr);
	});

	schema.setRead(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var item = MAIN.apps.findItem('id', $.id);
		if (item) {
			var obj = {};
			obj.typeid = item.typeid;
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
			obj.color = item.color;
			obj.icon = item.icon;
			obj.origintoken = item.origintoken;
			obj.allowguestuser = item.allowguestuser;
			obj.allownotifications = item.allownotifications;
			obj.allowreadmeta = item.allowreadmeta;
			obj.allowreadprofile = item.allowreadprofile;
			obj.allowreadusers = item.allowreadusers;

			DBMS().query('SELECT COUNT(1)::int4 as running FROM tbl_user WHERE inactive=FALSE AND online=TRUE AND running && $1', [[obj.id]]).first().callback(function(err, response) {
				obj.count = response.running;
				$.extend && $.extend(obj);
				$.callback(obj);
			});

		} else
			$.invalid('error-apps-404');
	});

	schema.addWorkflow('check', function($, model) {
		if ($.controller && FUNC.notadmin($))
			return;
		var app = MAIN.apps.findItem('url', model.url);
		if (app && app.id !== $.id)
			$.invalid('error-apps-exists');
		else
			$.success();
	});

	schema.addWorkflow('refresh', function($, model) {
		if ($.controller && FUNC.notadmin($))
			return;
		FUNC.refreshapp(model, $.done(), !model.id || model.permissions);
	});

	schema.setInsert(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (model.typeid === 'designer')
			model.name = model.title;

		if (!model.name) {
			$.invalid('error-apps-meta');
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

		if (model.typeid === 'designer') {
			model.online = true;
			model.url = null;
		}

		if (!model.services)
			delete model.services;

		if (!model.settings)
			delete model.settings;

		if (!model.titles)
			model.titles = null;

		$.extend && $.extend(model);

		var db = DBMS();
		db.insert('tbl_app', model).callback(function(err, response) {
			if (response) {
				FUNC.refreshapps(function() {
					EMIT('apps/create', model.id);
					FUNC.refreshguest();
					FUNC.updateroles($.done(model.id));
				});
			} else
				$.invalid(err);
		});
		db.log($, model, model.name);
	});

	schema.setUpdate(function($, model) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (model.typeid === 'designer')
			model.name = model.title;

		if (!model.name) {
			$.invalid('error-apps-meta');
			return;
		}

		model.dtupdated = NOW;

		if (model.rebuildaccesstoken)
			model.accesstoken = GUID(30);

		if (model.rebuildservicetoken)
			model.servicetoken = GUID(15);

		if (!model.titles)
			model.titles = null;

		if (model.typeid === 'designer') {
			model.online = true;
			model.url = null;
		}

		model.permissions = undefined;
		model.rebuildaccesstoken = undefined;
		model.rebuildservicetoken = undefined;
		model.previd = undefined;
		model.linker = model.name.slug(40);
		model.search = (model.name + ' ' + model.title).toSearch().max(40);

		$.extend && $.extend(model);

		var db = DBMS();

		db.mod('tbl_app', model).id($.id).callback(function(err, response) {
			if (response) {
				FUNC.refreshapps(function() {
					EMIT('apps/update', $.id);
					FUNC.refreshguest();
					FUNC.updateroles($.done($.id));
					FUNC.clearcache(null, $.id);
				});
			} else
				$.invalid(err || 'error-apps-404');
		});

		db.log($, model, model.name);
	});

	schema.setRemove(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var app = MAIN.apps.findItem('id');

		$.extend && $.extend(app);

		var db = DBMS();
		db.remove('tbl_app').id($.id).callback(function() {
			FUNC.refreshapps(function() {
				FUNC.updateroles($.done());
				FUNC.clearcache(null, $.id);
			});
		});
		db.log($, null, app ? app.name : '');
	});

	schema.addWorkflow('meta', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		if (!$.query.url || !$.query.url.isURL())
			$.invalid('error-invalid-url');
		else {
			RESTBuilder.GET($.query.url).exec(function(err, response, output) {
				if (err)
					$.invalid(err);
				else {
					response.hostname = output.hostname;
					$.success(response);
				}
			});
		}
	});

	// List of apps for apps
	schema.addWorkflow('public', function($) {
		FUNC.decodetoken($, function(obj) {

			if (!obj.app.allowreadapps)
				return $.invalid('error-permissions');

			var arr = [];
			for (var i = 0; i < MAIN.apps.length; i++) {
				var item = MAIN.apps[i];
				if (item.type !== 'designer') {
					var app = FUNC.makeapp(item, obj.app.allowreadapps);
					if (app)
						arr.push(app);
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
			$.success(true, app.favorite);

			var db = DBMS();
			db.modify('tbl_user_app', { favorite: app.favorite }).id(user.id + $.id);

			app = MAIN.apps.findItem('id', $.id);
			db.log($, null, app.name);

		} else
			$.invalid('error-apps-404');
	});

	schema.addWorkflow('run', function($) {

		var user = $.user;
		var data;

		switch ($.id) {
			case '_admin':
				data = { datetime: NOW, ip: $.ip, accesstoken: $.id + '-' + user.accesstoken + '-' + user.id + '-' + user.verifytoken, url: '/' + $.id.substring(1) + '/', settings: null, id: $.id, mobilemenu: true };
				$.callback(data);
				return;

			case '_welcome':
			case '_account':
				data = { datetime: NOW, ip: $.ip, accesstoken: $.id.substring(1) + '-0-' + user.id + '-0', url: $.id === '_welcome' ? CONF.welcome : '/{0}/'.format($.id.substring(1)), settings: null, id: $.id, mobilemenu: false };
				$.callback(data);
				return;
		}

		var app = MAIN.apps.findItem('id', $.id);
		if (!app) {
			$.invalid('error-apps-404');
			return;
		}

		var db = DBMS();

		db.log($, null, app.name);

		data = user.guest ? FUNC.metaguest() : FUNC.meta(app, user);

		if (data) {

			data.ip = $.ip;
			data.href = $.query.href;

			if (user.guest) {

				data.id = app.id;
				data.url = app.frame;
				data.accesstoken = '0-0-0';

			} else {

				var isreset = user.apps[$.id].countnotifications || user.apps[$.id].countbadges;

				data.notifications = user.apps[$.id].notifications !== false;
				user.countnotifications -= user.apps[$.id].countnotifications;

				if (user.countnotifications < 0)
					user.countnotifications = 0;

				user.apps[$.id].countnotifications = 0;

				isreset && db.modify('tbl_user_app', DB_RESET).id($.user.id + $.id);

				user.apps[$.id].countbadges = 0;
				data.newversion = user.apps[$.id].version !== app.version;
				data.version = user.apps[$.id].version || '';

				var tmp;

				if (data.newversion) {
					tmp = {};
					tmp.version = app.version;
					user.apps[$.id].version = app.version;
					db.mod('tbl_user_app', tmp).id(user.id + $.id);
				}

				tmp = {};
				tmp['+countopen'] = 1;
				tmp.dtopen = NOW;
				db.mod('tbl_user_app', tmp).id(user.id + $.id);

				var usageid = NOW.format('yyyyMMdd') + $.id;
				var usage = USAGE_STATS.findItem('id', usageid);
				var key;

				if (!usage) {
					usage = {};
					USAGE_STATS.push(usage);
				}

				usage.id = usageid;
				usage.appid = $.id;

				key = '+count';
				usage[key] = (usage[key] || 0) + 1;

				key = '+' + (user.mobile ? 'mobile' : 'desktop');
				usage[key] = (usage[key] || 0) + 1;

				key = '+' + (user.desktop === 1 ? 'windowed' : user.desktop === 2 ? 'tabbed' : 'desktop');
				usage[key] = (usage[key] || 0) + 1;

				key = '+' + (user.darkmode === 1 ? 'darkmode' : 'lightmode');
				usage[key] = (usage[key] || 0) + 1;

				// MAIN.session.set2(user.id, user);
			}

			if (app.typeid === 'designer')
				data.url = '/builder/' + $.id + '/';

			$.callback(data);
		} else
			$.invalid('error-apps-404');

	});

	schema.addWorkflow('reset', function($) {

		var user = $.user;

		if (!user.apps[$.id]) {
			$.invalid(404);
			return;
		}

		user.apps[$.id].countnotifications = 0;
		user.apps[$.id].countbadges = 0;
		DBMS().modify('tbl_user_app', DB_RESET).id($.user.id + $.id);
		$.success(true);
	});

	schema.addWorkflow('mute_notifications', function($) {
		var user = $.user;
		if (user.apps[$.id]) {
			var app = MAIN.apps.findItem('id', $.id);
			var model = { notifications: (user.apps[$.id].notifications == null || user.apps[$.id].notifications == true) ? false : true };

			user.apps[$.id].notifications = model.notifications;
			$.success(true, model.notifications);

			var db = DBMS();
			db.modify('tbl_user_app', model).id($.user.id + $.id);
			db.log($, null, app.name);
		} else
			$.invalid(404);
	});

	schema.addWorkflow('mute_sounds', function($) {
		var user = $.user;
		if (user.apps[$.id]) {
			var app = MAIN.apps.findItem('id', $.id);
			var model = { sounds: (user.apps[$.id].sounds == null || user.apps[$.id].sounds == true) ? false : true };

			user.apps[$.id].sounds = model.sounds;
			$.success(true, model.sounds);

			var db = DBMS();
			db.modify('tbl_user_app', model).id($.user.id + $.id);
			db.log($, null, app.name);
		} else
			$.invalid(404);
	});

	schema.addWorkflow('dnsresolver', function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		if ((/^http(s)+\:\/\/.*?\.\w{2,}$/i).test($.query.domain || '')) {
			U.resolve(self.query.domain, function(err, response, param, addresses) {
				$.callback(err ? EMPTYARRAY : (addresses || [response.host] || EMPTYARRAY));
			});
		} else
			$.callback(EMPTYARRAY);
	});

});

NEWSCHEMA('Apps/Position', function(schema) {
	schema.define('id', 'String(25)', true);
	schema.define('position', Number);
});

NEWSCHEMA('Apps/Positions', function(schema) {
	schema.define('apps', '[Apps/Position]');
	schema.setSave(function($, model) {
		var user = $.user;
		var apps = model.apps;
		var db = DBMS();
		for (var i = 0; i < apps.length; i++) {
			var app = apps[i];
			user.apps[app.id].position = app.position;
			db.modify('tbl_user_app', { position: app.position }).id(user.id + app.id);
		}
		db.log($, model);
		db.callback($.done());
	});
});


var usage_insert = function(doc, params) {
	doc.id = params.id;
	doc.appid = params.appid;
	doc.date = NOW;
};

ON('service', function() {

	if (!USAGE_STATS.length)
		return;

	var stats = USAGE_STATS.splice(0, 100);
	var db = DBMS();

	for (var i = 0; i < stats.length; i++) {
		var usage = stats[i];
		var id = usage.id;
		var appid = usage.appid;
		usage.id = undefined;
		usage.appid = undefined;
		db.mod('tbl_usage_app', usage, true).id(id).insert(usage_insert, { id: id, appid: appid });
	}

});