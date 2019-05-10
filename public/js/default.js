var WSLOGMESSAGE = {};
var common = {};

common.muted = {};
common.page = '';
common.form = '';
common.inlineform = '';
common.notifications = false;
common.data = {};
common.startmenu = false;
common.startmenuapps = true;
common.console = {};
common.consolewindow = false;
common.consolecount = 0;
common.wikishow = false;
common.wiki = EMPTYARRAY;

NAV.clientside('.jr');
SETTER(true, 'loading', 'hide', 500);

WATCH('common.page', function() {
	SETTER('inlineform', 'hide');
});

ON('resize', function() {

	$('.scrollable').css('height', WH - 50);
	$('.fullheight').each(function() {
		var el = $(this);
		el.css('height', WH - (el.offset().top + 20));
	});

	var d = WIDTH();
	var w = (WW / (d === 'xs' ? 1.10 : 1.40)) >> 0;
	var h = (WH / 1.40) >> 0;
	$('.launchpad').css({ height: h, width: w, left: ((WW / 2) - (w / 2)) >> 0, top: ((WH / 2) - (h / 2)) >> 0 });
	var com = $('#dashboardapps')[0].$com;
	com && PLUGIN('Dashboard').resizeapps.call(com);

});

$(window).on('resize', function() {
	EMIT('resize');
});

ON('ready', function() {
	EMIT('resize');
});

function onImageError(image) {
	// image.onerror = null;
	image.src = '/img/empty.png';
	return true;
}

Thelpers.encodedata = function(value) {
	return encodeURIComponent(value || '');
};

Thelpers.markdown_notifications = function(value) {
	return (value || '').markdown(MD_NOTIFICATION);
};

Thelpers.markdown_status = function(value) {
	return '<i class="fa fa-{0} mr5"></i>'.format(value.type === 'success' ? 'check-circle' : value.type === 'warning' ? 'warning' : value.type === 'error' ? 'bug' : 'info-circle') + (value.body || '').markdown(MD_LINE);
};

Thelpers.photo = function(value) {
	return value ? ('/photos/' + value) : '/img/face.jpg';
};

Thelpers.responsive = function(value) {
	return isMOBILE ? (value === true ? '' : ' app-disabled') : '';
};

$(window).on('message', function(e) {

	var data = PARSE((e.originalEvent && e.originalEvent.data).toString() || '');
	if (!data || !data.openplatform)
		return;

	if (data.type === 'refreshprofile')
		refresh_profile();

	var app = dashboard.apps.findItem('accesstoken', data.accesstoken);
	if (!app || (!app.internal.internal && app.url.indexOf(data.origin) === -1))
		return;

	var processes = FIND('processes');

	switch (data.type) {

		case 'install':

			if (user.sa) {
				var target = user.apps.findItem('id', '_apps');
				if (target) {
					internalapp($('.internal[data-id="_apps"]'));
					processes.wait(target, function(iframe) {
						data.body.app = app.id;
						processes.message(iframe, 'share', data.body);
					}, false);
				}
			}

			break;

		case 'options':

			if (data.body instanceof Array) {
				for (var i = 0; i < data.body.length; i++) {
					var mi = data.body[i];
					if (mi && typeof(mi) === 'object')
						mi.callbackid = data.callback;
				}
				common.appoptions.appitems = data.body;
			}

			break;

		case 'help':
			// markdown help
			SET('common.wiki', data.body.body || EMPTYARRAY);
			var is = common.wiki ? common.wiki.length > 0 : false;
			is && RECONFIGURE('wiki', { title: 'Wiki: ' + app.internal.title || app.internal.name });
			SET('common.wikishow', is);
			break;

		case 'console':

			data.body.body = data.body.msg;
			delete data.body.msg;

			var all = false;
			var id = 'app' + app.id;

			switch (data.body.type) {
				case 0:
					data.body.type = 'info';
					break;
				case 1:
					data.body.type = 'success';
					break;
				case 2:
					data.body.type = 'warning';
					break;
				case 3:
				case 99:
					data.body.type = 'error';
					break;
			}

			// process console
			if (common.console[id] == null) {
				common.console[id] = { icon: app.internal.icon, name: app.internal.title || app.internal.name, items: [data.body] };
				all = true;
			} else
				common.console[id].items.unshift(data.body);

			if (common.console[id].items.length > 100)
				common.console[id].items = common.console[app.id].items.splice(0, 100);

			if (app.id === common.focused)
				SET('common.status', data.body);

			UPDATE('common.console' + (all ? '' : ('.' + id)));

			if (data.body.show) {
				SETTER('console', 'show', id);
				SET('common.consolewindow', true);
			}

			if (!common.consolewindow)
				INC('common.consolecount');

			break;

		case 'screenshot':
			SET('screenshot.data', data.body);
			// screenshot.app = app ? app.internal : null;
			SET('common.form', 'screenshot');
			break;

		case 'appearance':
			if (app) {
				var iframe = processes.findProcess(app.id);
				iframe && processes.message(iframe, 'appearance', { darkmode: user.darkmode, colorscheme: user.colorscheme }, data.callback);
			}
			break;

		case 'launched':
			if (app) {

				var apps = [];
				for (var i = 0; i < dashboard.apps.length; i++) {
					var da = dashboard.apps[i].internal;
					apps.push({ id: da.id, icon: da.icon, name: da.name, title: da.title, version: da.version, type: da.type });
				}

				var iframe = processes.findProcess(app.id);
				iframe && processes.message(iframe, 'launched', apps, data.callback);
			}
			break;

		case 'verify':
		case 'meta':

			if (app && navigator.userAgent === data.body.ua) {

				var iframe = processes.findProcess(app.id);

				if (!iframe.meta.internal && (iframe.meta.verify.indexOf(app.accesstoken) === -1 || iframe.iframe.attr('src').indexOf(iframe.meta.url) === -1))
					return;

				var meta = CLONE(iframe.meta);
				meta.internal = undefined;
				meta.index = undefined;
				meta.running = undefined;
				meta.accesstoken = undefined;
				meta.data = common.data[app.id];
				meta.width = iframe.element.width();
				meta.height = iframe.iframe.height();
				meta.ww = WW;
				meta.wh = WH;
				meta.display = WIDTH();
				processes.message(iframe, 'verify', meta, data.callback);
				iframe.meta.href = undefined;
				if (data.type === 'verify') {
					setTimeout(function() {
						processes.notifyresize2(app.id);
					}, 100);
				}
			}
			break;

		case 'share':
			var target = user.apps.findItem('id', data.body.app);
			if (target == null) {
				data.body.app = data.body.app.toLowerCase();
				for (var i = 0; i < user.apps.length; i++) {
					if (user.apps[i].name.toLowerCase() === data.body.app) {
						target = user.apps[i];
						break;
					}
				}
			}

			if (target) {

				if (data.body.silent === 'open' || data.body.silent === 2) {
					var is = processes.findProcess(target.id);
					if (!is)
						return;
				}

				processes.wait(target, function(iframe) {
					data.body.app = app.id;
					processes.message(iframe, 'share', data.body);

					if (data.body.silent !== true)
						processes.focus(target.id);

				}, data.body.silent);
			}

			break;

		case 'progress':
			if (app) {
				var p = data.body || 0;
				if (p >= 100 || p < 0)
					p = 0;
				if (app.progress === p)
					return;
				var appwindow = $('.ap' + app.id);
				appwindow.find('span').animate({ width: p + '%' }, 100);
				appwindow = appwindow.parent();
				var icon = appwindow.find('> div > .fa');
				if (p)
					!app.progress && icon.rclass2('fa-').rclass('usercolor').aclass('fa-spinner fa-pulse usercolor');
				else
					icon.rclass2('fa-').rclass('usercolor').aclass('fa-' + app.internal.icon);
				app.progress = p;
			}
			break;

		case 'menu':
			if (app) {
				var iframe = processes.findProcess(app.id);
				iframe && processes.message(iframe, 'menu', null);
			}
			break;

		case 'maximize':
			app && processes.maximize(app.id);
			break;

		case 'shake':
			app && processes.shake(app.id, data.body);
			break;

		case 'focus':
			common.startmenu && SET('common.startmenu', false);
			app && processes.focus(app.id);
			break;

		case 'restart':

			if (app) {
				// common.messages[app.id] = data.message;
				app.href = data.url;
				processes.kill(app.id);
				setTimeout(function() {
					AJAX('GET /api/profile/{0}/'.format(app.id), FUNC.open);
					// SET('dashboard.current', app);
				}, 1000);
			}

			break;

		case 'loading':
			var iframe = processes.findProcess(app.id);
			if (iframe) {
				var el = iframe.element.find('.ui-process-loading');
				if (data.body && typeof(data.body) !== 'boolean') {
					el.find('.ui-process-loading-text').html((data.body.text || '').markdown(MD_LINE));
					el.tclass('hidden', !data.body.show);
				} else
					el.tclass('hidden', data.body !== true); // backward compatibility
			}
			break;

		case 'loading2':
			var iframe = processes.findProcess(app.id);
			if (iframe) {
				var fa = iframe.element.find('.ui-process-header').find('div .fa');
				var icon = iframe.meta.internal.icon;
				if (data.body == true)
					fa.rclass('fa-' + icon).aclass('fa-pulse fa-spinner usercolor');
				else
					fa.rclass('fa-pulse fa-spinner usercolor').aclass('fa-' + icon);
			}
			break;

		case 'snackbar':
			SETTER('snackbar', data.body.type || 'success', data.body.body.markdown(MD_LINE), data.body.button);
			break;

		case 'config':

			var configcb = function(response, err) {
				if (data.callback) {
					var iframe = processes.findProcess(app.id);
					iframe && data.callback && processes.message(iframe, 'config', typeof(response) === 'string' ? PARSE(response) : response, data.callback, err);
				}
			};

			var atoken = app.profile.notify.substring(app.profile.notify.indexOf('accesstoken='));
			if (data.body.body) {
				var tmp = {};
				tmp.body = data.body.body;
				AJAX('POST /api/config/?' + atoken, tmp, configcb);
			} else
				AJAX('GET /api/config/?' + atoken, configcb);

			break;

		case 'message':
			SETTER('message', data.body.type || 'success', '<div style="margin-bottom:10px;font-size:16px" class="b"><i class="fa fa-{0} mr5"></i>{1}</div>'.format(app.internal.icon, app.internal.title) + data.body.body.markdown(MD_LINE), null, null, data.body.button);
			break;

		case 'confirm':
			SETTER('confirm', 'show', data.body.body, data.body.buttons, function(index) {
				var iframe = processes.findProcess(app.id);
				iframe && data.callback && processes.message(iframe, 'confirm', { index: index }, data.callback);
			});
			break;

		case 'play':
		case 'stop':

			if (common.muted[app.id])
				return;

			var custom = false;
			switch (data.body) {
				case 'done':
				case 'drum':
				case 'beep':
				case 'confirm':
				case 'fail':
				case 'success':
				case 'phone':
				case 'message':
				case 'alert':
				case 'badges':
				case 'notifications':
					custom = true;
					break;
				case 'warning':
					data.body = 'alert';
					custom = true;
					break;
			}

			if (custom)
				data.body = '/sounds/' + data.body + '.mp3';

			user.sounds && SETTER('audio', data.type, data.body);

			break;

		case 'badge':
			if (app) {
				if (data.body == null && app.id === common.focused)
					return;
				AJAX('GET /api/badges/?' + app.profile.badge.substring(app.profile.badge.indexOf('accesstoken=')), NOOP);
			}
			break;

		case 'notify':
			app && app.internal.notifications && AJAX('POST /api/notify/?' + app.profile.notify.substring(app.profile.notify.indexOf('accesstoken=')), data.body, NOOP);
			break;

		case 'minimize':
			app && processes.minimize();
			break;

		case 'log':
			WSLOGMESSAGE.appid = app.id;
			WSLOGMESSAGE.appurl = app.url;
			WSLOGMESSAGE.body = data.body;
			AJAX('POST /api/profile/logger/', WSLOGMESSAGE);
			// SETTER('websocket', 'send', WSLOGMESSAGE);
			break;

		case 'open':
			common.data[data.body.id] = data.body.data;
			var el = $('.app[data-id="{0}"]'.format(data.body.id));
			el.length && el.trigger('click');
			break;

		case 'kill':
			app && processes.kill(app.id);
			break;
	}
});

FUNC.open = function(data) {

	if (data == null) {
		// maybe blocked
		// refresh
		location.reload(true);
		return;
	}

	data.internal = user.apps.findItem('id', data.id);
	data.progress = 0;
	dashboard.apps.push(data);
	SET('dashboard.current', data);
	$('.appunread[data-id="{0}"]'.format(data.id)).aclass('hidden');
	$('.appbadge[data-id="{0}"]'.format(data.id)).aclass('hidden');
	SETTER('processes', 'emitevent', 'app.open', data.id);
};