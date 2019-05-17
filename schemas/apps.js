const session = SESSION('users');

NEWSCHEMA('AppMeta', function(schema) {
	schema.define('url', 'Url', true);
	schema.addWorkflow('exec', function($) {
		RESTBuilder.make(function(builder) {
			builder.url($.model.url);
			builder.exec(function(err, response) {
				err && $.error.push(err);
				$.success(true, response);
			});
		});
	});
});

NEWSCHEMA('App', function(schema) {

	schema.define('id', 'UID');
	schema.define('url', 'Url', true);
	schema.define('title', 'String(30)', true);
	schema.define('accesstoken', 'String(50)');
	schema.define('serialnumber', 'String(50)');
	schema.define('permissions', Boolean);
	schema.define('autorefresh', Boolean);
	schema.define('guest', Boolean);
	schema.define('directories', '[String]');
	schema.define('settings', Object);

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
			} else if (!user.apps[app.id]) {
				$.invalid('error-permissions');
				return;
			}

			if ($.query.userid) {
				FUNC.users.get($.query.user.id, function(err, profile) {
					if (err) {
						$.invalid(err);
					} else {
						$.query.id = Object.keys(profile.apps);
						OP.apps(app, $.query, $.callback);
					}
				});
			} else
				OP.apps(app, $.query, $.callback);
		});
	});

	schema.setSave(function($) {

		if (!$.user.sa || $.user.directory) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.model.$clean();
		var permissions = model.permissions;

		model.search = (model.name + ' ' + model.title).toSearch();
		model.linker = model.title.slug();
		model.permissions = undefined;

		if (model.id) {
			FUNC.apps.get(model.id, function(err, item) {
				if (item) {
					FUNC.logger('apps', 'update: ' + item.id + ' - ' + item.name, '@' + $.user.name, $.ip);
					model.dtupdated = NOW;
					sync(item, model, true, permissions);
					OP.refresh(item, function() {
						FUNC.apps.set(item, null, function() {
							FUNC.emit('apps.update', item.id);
							FUNC.emit('apps.refresh', item.id);
							$.success();
						});
					});
				} else
					$.invalid('error-apps-404');
			});
		} else {
			model.dtcreated = NOW;
			OP.refresh(model, function(err) {

				if (err) {
					$.invalid(err);
					return;
				}

				FUNC.apps.set(model, null, function(err, id) {
					FUNC.emit('apps.create', id);
					FUNC.emit('apps.refresh', id);
					FUNC.logger('apps', 'create: ' + id + ' - ' + model.name, '@' + $.user.name, $.ip);
					$.success();
				});
			}, true);
		}
	});

	schema.setRemove(function($) {

		if (!$.user.sa || $.user.directory) {
			$.invalid('error-permissions');
			return;
		}

		var id = $.id;
		FUNC.apps.rem(id, function() {
			FUNC.logger('apps', 'remove: ' + id, '@' + $.user.name, $.ip);
			FUNC.emit('apps.remove', id);
			FUNC.emit('apps.refresh', id, true);
			$.success();
		});
	});

	schema.addWorkflow('refresh', function($) {
		RESTBuilder.make(function(builder) {
			builder.url($.model.url);
			builder.exec(function(err, response) {

				if (response === EMPTYOBJECT || err) {
					$.error.push(err ? err : 'error-invalid-url');
					$.callback();
					return;
				}

				var model = $.model;

				if (response.origin && response.origin.length)
					model.origin = response.origin;
				else
					model.origin = null;

				model.version = response.version;
				model.name = response.name;
				model.description = response.description;
				model.author = response.author;
				model.type = response.type;
				model.icon = response.icon;
				model.frame = response.url;
				model.email = response.email;
				model.roles = response.roles;
				model.groups = response.groups;
				model.custom = response.custom;
				model.mainmenu = response.mainmenu;
				model.responsive = response.responsive;
				model.readme = response.readme;
				model.online = true;
				model.dtsync = NOW;
				model.autorefresh = response.autorefresh;

				if (model.permissions || model.autorefresh) {
					model.allowreadapps = response.allowreadapps;
					model.allowguestuser = response.allowguestuser;
					model.allowreadusers = response.allowreadusers;
					model.allowreadmeta = response.allowreadmeta;
					model.allowreadprofile = response.allowreadprofile;
					model.allownotifications = response.allownotifications;
				}

				$.success();
			});
		});
	});

	schema.addWorkflow('favorite', function($) {
		var user = $.user;
		var app = user.apps[$.id];
		if (app) {
			app.favorite = app.favorite == null ? true : !app.favorite;
			session.set2(user.id, user);
			FUNC.users.set(user, ['apps'], null, app, 'favorite');
			$.success(true, app.favorite);
		} else
			$.invalid('error-apps-404');
	});

	schema.addWorkflow('run', function($) {

		var user = $.user;
		var data;

		switch ($.id) {
			case '_users':
			case '_apps':
			case '_info':
			case '_settings':
			case '_account':
			case '_welcome':

				if ($.id !== '_account' && !user.sa) {
					$.invalid('error-permissions');
					return;
				}

				data = { datetime: NOW, ip: $.ip, accesstoken: $.id + '-' + user.accesstoken + '-' + user.id + '-' + user.verifytoken, url: $.id === '_welcome' ? CONF.welcome : '/{0}/'.format($.id.substring(1)), settings: null, id: $.id, mobilemenu: $.id !== '_account' && $.id !== '_welcome' && $.id !== '_settings' };
				$.callback(data);

				return;
		}

		if (!user.apps[$.id]) {
			$.invalid('error-apps-404');
			return;
		}

		FUNC.apps.get($.id, function(err, app) {

			if (app) {
				data = OP.meta(app, user);

				FUNC.logger('logs', 'run: ' + app.id + ' (' + app.name + ')', '@' + user.name, $.ip);

				if (data) {
					data.ip = $.ip;
					data.href = $.query.href;
					data.notifications = user.apps[$.id].notifications !== false;

					$.callback(data);

					user.apps[$.id].countnotifications = 0;
					user.apps[$.id].countbadges && FUNC.badges.rem(user.id, $.id);
					user.apps[$.id].countbadges = 0;

					session.set2(user.id, user);

					// Stats
					var db = NOSQL('apps');
					db.counter.hit('all');
					db.counter.hit($.id);

					return;
				}
			}

			$.invalid('error-apps-404');
		});
	});

	schema.addWorkflow('mute', function($) {
		var user = $.user;

		if (!user.apps[$.id]) {
			$.invalid('error-apps-404');
			return;
		}

		user.apps[$.id].notifications = (user.apps[$.id].notifications == null || !user.apps[$.id].notifications == false) ? false : true;

		session.set2(user.id, user);
		$.success(true, user.apps[$.id].notifications == true);
	});

});

function sync(item, model, meta, permissions) {

	if (meta) {
		item.title = model.title;
		item.options = model.options;
		item.serialnumber = model.serialnumber;

		if (permissions) {
			item.allowreadapps = model.allowreadapps;
			item.allowreadusers = model.allowreadusers;
			item.allowreadmeta = model.allowreadmeta;
			item.allowreadprofile = model.allowreadprofile;
			item.allowguestuser = model.allowguestuser;
			item.allownotifications = model.allownotifications;
		}

		item.responsive = model.responsive;
		item.blocked = model.blocked;
		item.settings = model.settings;
		item.accesstoken = model.accesstoken;
		item.serververify = model.serververify;
		item.mobilemenu = model.mobilemenu;
		item.autorefresh = model.autorefresh;
	}

	item.linker = model.linker;
	item.version = model.version;
	item.name = model.name;
	item.description = model.description;
	item.author = model.author;
	item.icon = model.icon;
	item.screenshots = model.allowscreenshots === true;
	item.frame = model.frame;
	item.email = model.email;
	item.roles = model.roles;
	item.directories = model.directories;
	item.groups = model.groups;
	item.version = model.version;
	item.custom = model.custom;
	item.online = model.online === true;
	item.dtsync = NOW;
	item.origin = model.origin;
	item.width = model.width;
	item.height = model.height;
	item.resize = model.resize;
	item.guest = model.guest;
}