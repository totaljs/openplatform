function onImageError(image) {
	// image.onerror = null;
	image.src = '/img/empty.png';
	return true;
}

Thelpers.markdown_notifications = function(value) {
	// [+ means no responsive image
	return (value || '').replace(/\[\+/g, '[').markdown(MD_NOTIFICATION);
};

Thelpers.markdown_status = function(value) {
	return '<i class="fa fa-{0} mr5"></i>'.format(value.type === 'success' ? 'check-circle' : value.type === 'warning' ? 'warning' : value.type === 'error' ? 'bug' : 'info-circle') + (value.body || '').markdown(MD_LINE);
};

Thelpers.photo = function(value) {
	return value ? ('/photos/' + value) : '/img/photo.jpg';
};

Thelpers.icon = function(val) {
	return (val.indexOf('fa-') === -1) ? ('fa-' + ((/\sfar|fab|fas|fal$/).test(val) ? val : (val + ' fa'))) : val;
};

Thelpers.encodedata = function(value) {
	return encodeURIComponent(value || '');
};

FUNC.icon = function(icon) {
	if (icon.indexOf('fa-') === -1)
		icon = 'fa-' + icon;
	return icon.indexOf(' ') === -1 ? (icon + ' fa') : icon;
};

FUNC.playsound = function(name, appid) {

	if (!user.sounds)
		return;

	if (appid && typeof(appid) === 'object')
		appid = appid.id;

	if (appid && appid.charAt(0) !== '_') {
		if (typeof(appid) === 'string') {
			if (!user.apps.findValue('id', appid, 'sounds'))
				return;
		} else if (!appid.sounds)
			return;
	}

	SETTER('audio/play', '/sounds/' + name + '.mp3');
};

FUNC.faviconbadge = function(text, color) {

	var key = '$badgeicon';
	var tmp = W[key];

	if (!text && !tmp)
		return;

	if (!tmp) {
		tmp = W[key] = {};
		tmp.el = $(document.head).find('link[rel="icon"]');
		tmp.href = tmp.el.attr('href');
		tmp.type = tmp.el.attr('type');
	}

	if (!text) {
		tmp.el.attr({ type: tmp.type, href: tmp.href });
		return;
	}

	var canvas = document.createElement('canvas');
	var img = new Image();
	img.src = tmp.href;
	img.onload = function() {
		canvas.width = img.width;
		canvas.height = img.height;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		ctx.fillStyle = color || 'red';
		var size = img.width / 3.4;
		ctx.arc(img.width - size, img.height - size, size, 0, 2 * Math.PI);
		ctx.fill();
		ctx.textAlign = 'center';
		ctx.fillStyle = 'white';
		ctx.font = 'bold 12px Arial';

		if (text > 99)
			text = '99';
		else
			text += '';

		ctx.fillText(text, img.width - size, img.height - 5);
		tmp.el.attr({ type: 'image/png', href: canvas.toDataURL() });
	};
};

COMPONENT('processes', 'margin:0;parent:auto', function(self, config) {

	var self = this;
	var template_iframe = '<iframe src="/loading.html" frameborder="0" scrolling="no" allowtransparency="true" allow="geolocation *; microphone *; camera *; midi *; encrypted-media *"></iframe>';

	self.singleton();
	self.readonly();
	self.nocompile();

	self.make = function() {
		var scr = self.find('scri' + 'pt');
		self.template = Tangular.compile(scr.html());
		scr.remove();
	};

	self.focus = function(app, force) {

		SETTER('!menu/hide');

		if (app.countbadges || app.countnotifications) {
			app.countbadges = 0;
			app.countnotifications = 0;
			DAPI('reset/' + app.id, NOOP);
		}

		if (!app.window)
			return;

		if (!force && common.focused === app.id)
			return;

		var apps = self.get();

		for (var i = 0; i < apps.length; i++) {
			var item = apps[i];
			if (item.isfocused) {
				item.isfocused = false;
				item.window && item.window.rclass('focused');
				EMIT('app_focus', item, false);
			}
		}

		app.dtfocused = new Date();
		app.isfocused = true;
		app.window.aclass('focused');
		app.send('focus');
		SET('common.focused', app.id);
		EMIT('app_focus', app, true);
		self.update('focus');
	};

	var $W = $(W);

	function findparent(el, sel) {

		if (!sel)
			return;

		if (sel === 'auto') {
			var dom = el[0].parentNode;
			while (true) {
				if (dom.tagName === 'BODY')
					break;
				if (dom.style.height && !dom.classList.contains('ui-scrollbar-area'))
					return $(dom);
				dom = dom.parentNode;
			}
			return $W;
		}

		if (sel.substring(0, 6) !== 'parent')
			return sel === 'window' ? $W : sel === 'document' ? D : el.closest(sel);

		var count = sel.substring(6);
		var parent = el.parent();

		if (count) {
			count = +count;
			for (var i = 0; i < count; i++)
				parent = parent.parent();
		}

		return parent;
	}

	self.resizeforce = function() {
		var items = self.get() || EMPTYARRAY;
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			self.iframe_resize(item);
		}
	};

	ON('resize + resize2', function() {
		setTimeout2(self.ID, self.resizeforce, 300);
	});

	self.iframe_resize = function(item) {
		if (item.isrunning) {
			var parent = findparent(item.window, config.parent);
			if (parent) {
				var css = { width: parent.width(), height: parent.height() - config.margin };
				item.window.find('.autosize').css(css);
				// item.iframe.css(css);
				EMIT('app_resize', item, css);
				item.send && item.send('resize');
			}
		}
	};

	self.send_all = function(type, message) {
		var items = self.get();
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			item.isrunning && self.send(item, type, message);
		}
	};

	self.send = function(app, type, message, callbackid, error) {

		if (!app.isloaded) {
			setTimeout(self.send, 300, app, type, message, callbackid, error);
			return;
		}

		var data = {};

		data.openplatform = true;
		data.type = type;
		data.body = message;

		if (error)
			data.error = error.toString();

		if (callbackid)
			data.callback = callbackid;

		if (app.window)
			app.window[0].scrollTop = -1;

		if (app.iframe)
			app.iframe[0].contentWindow.postMessage(STRINGIFY(data), '*');

		return true;
	};

	function makeurl(url, accesstoken, rev) {

		accesstoken = encodeURIComponent(location.origin + '/verify/?accesstoken=' + encodeURIComponent(accesstoken));

		var language = '&language=' + (user.language || 'en');
		if (rev)
			language += '&rev=' + rev;

		var index = url.indexOf('?');
		if (index === -1)
			return url + '?openplatform=' + accesstoken + language;
		else
			return url.substring(0, index + 1) + 'openplatform=' + accesstoken + language + '&' + url.substring(index + 1);
	}

	function iframe_ready(app) {
		if (app.data) {
			app.send('share', app.data);
			app.data = null;
		}
		app.isloaded = true;
		self.focus(app, true);
		app.callback && app.callback(app);
		app.callback = null;
	}

	function iframe_loaded() {
		var t = this;
		if (t.$loaded)
			return;
		try {
			if (W.require)
				t.required = W.require;
		} catch (e) {}
		setTimeout(iframe_ready, 500, t.$app);
		t.$loaded++;
	}

	function iframe_load(app) {
		var meta = app.meta;
		var url = meta.url;
		if (meta.href) {
			if (meta.href.substring(0, 1) === '/')
				url = (url + meta.href.substring(1));
			else if (meta.href.indexOf(url) !== -1)
				url = meta.href;
		}
		app.iframe.attr('src', makeurl(url, meta.accesstoken, meta.rev));
	}

	function iframe_kill(app) {

		if (common.focused === app.id)
			NULL('common.focused');

		app.focused = false;
		EMIT('app_focus', app, false);

		app.send('kill');
		app.window.aclass('killed');
		app.send = null;
		app.progress = 0;
		EMIT('app_close', app);

		// Timeout for iframe cleaning scripts
		setTimeout(function(iframe, element) {
			iframe.attr('src', 'about:blank');
			iframe.remove();
			iframe = null;
			element.off();
			element.remove();
			element = null;
		}, 1000, app.iframe, app.window);

		app.window = null;
		app.iframe = null;
	}

	self.make_iframe = function(app) {

		var el = $(self.template({ value: app }));
		app.isrunning = true;
		app.islaunched = true;
		app.window = el;

		var target = el.find('.iframe');
		if (!target.length)
			target = el.filter('.iframe');

		if (common.focused && common.focused !== app.id) {
			var apps = self.get();
			if (apps) {
				var focused = apps.findItem('id', common.focused);
				focused && focused.window && focused.window.rclass('focused');
			}
		}

		app.window.aclass('focused');
		target.append(template_iframe);
		app.iframe = app.window.find('iframe');
		app.iframe[0].$loaded = 0;
		app.iframe[0].$app = app;
		app.iframe.on('load', iframe_loaded);
		app.send = function(type, message, callbackid, error) {
			self.send(app, type, message, callbackid, error);
		};

		app.resizeforce = function() {
			self.iframe_resize(app);
		};

		EMIT('app_make', app);

		if (!el[0].parentNode || !el[0].parentNode.tagName)
			self.append(el);

		self.iframe_resize(app);
		setTimeout(iframe_load, 100, app);
	};

	self.setter = function(value) {

		var change = false;
		var isrunning = false;

		if (value) {
			for (var i = 0; i < value.length; i++) {
				var item = value[i];
				if (item.meta) {
					if (!item.islaunched)
						self.make_iframe(item);
					isrunning = true;
				} else {
					if (item.isrunning) {
						item.isrunning = false;
						item.islaunched = false;
						item.isloaded = false;
						item.meta = null;
						iframe_kill(item);
						change = true;
					}
				}
			}
		}

		$('html').tclass('isrunning', isrunning);
		change && self.update('list');
	};

	function inlinemenudisplay(app, opt) {
		EMIT('app_options', app, opt, function() {

			if (app.meta.menuitems) {
				for (var i = 0; i < app.meta.menuitems.length; i++)
					opt.items.push(app.meta.menuitems[i]);
				opt.items.push('-');
				app.meta.menuitems = null;
			}

			opt.callback = function(selected) {

				EMIT('app_options_selected', app, selected);

				if (selected.callbackid) {
					var callbackid = selected.callbackid;
					selected.callbackid = undefined;
					app.send('options', selected, callbackid);
					return;
				}

				switch (selected.value) {
					case 'report':
						FUNC.reportbug(app.id);
						break;
					case 'favorite':
						EXEC('openplatform/favorite', app);
						break;
					case 'print':
						app.send('print');
						break;
					case 'changelog':
					case 'help':
						app.send(selected.value, app.oldversion || app.version);
						break;
					case 'close':
						app.meta = null;
						self.update('kill');
						break;
					case 'reset':
						EMIT('app_reset', app);
						break;
					case 'refresh':
						EXEC('openplatform/reload', app.id);
						break;
					case 'mutesounds':
						DAPI('mutesounds/' + app.id, function(response) {
							app.sounds = response.value;
							UPD('user.apps', 'sounds');
						});
						break;
					case 'mutenotifications':
						DAPI('mutenotifications/' + app.id, function(response) {
							app.notifications = response.value;
							UPD('user.apps', 'notifications');
						});
						break;
				}
			};
			SETTER('menu/show', opt);
		});
	}

	self.kill = function() {
		var items = self.get() || EMPTYARRAY;
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (item.meta)
				iframe_kill(item);
		}
	};

	self.inlinemenu = function(app, opt) {
		app.send('options');
		setTimeout(inlinemenudisplay, 300, app, opt);
	};

});

function notify_changelog(app) {
	app.send('changelog', app.version);
}

function notify_progress(app, progress) {
	var key = 'progress_' + app.id;
	delete TEMP[key];
	if (app.progress !== progress) {
		app.progress = progress;
		UPD('user.apps', 'progress');
		EMIT('app_progress', app, progress);
	}
}

$(W).on('message', function(e) {

	var msg = (e.originalEvent && e.originalEvent.data) + '';

	if (msg && msg.indexOf('openplatform"') === -1)
		return;

	var data = PARSE(msg);
	if (!data || !data.openplatform)
		return;

	var app;

	if (data.type === 'quicksearch') {
		SETTER('shortcuts/exec', 'F1');
		return;
	}

	if (data.type === 'refreshprofile') {
		EXEC('openplatform/refresh_profile');
		return;
	}

	var is = false;
	var app;

	for (var i = 0; i < user.apps.length; i++) {
		app = user.apps[i];
		if (app.isrunning && app.meta.accesstoken === data.accesstoken) {
			var origin = app ? app.meta.url : '';
			if (origin && origin.charAt(0) === '/')
				origin = location.origin + origin;
			if (origin.indexOf(data.origin) !== -1)
				is = true;
			break;
		}
	}

	if (!is)
		return;

	if (data.type === 'nextwindow') {
		EMIT('nextwindow');
		return;
	}

	switch (data.type) {

		case 'command':
			EMIT('command', data.body.type, data.body.body, app);
			break;

		case 'install':

			if (user.sa) {
				var target = user.apps.findItem('id', '_admin');
				if (target) {
					internalapp($('.internal[data-id="_admin"]'));
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
				app.meta.menuitems = data.body;
			}

			break;

		case 'help':

			if (!data.body.body) {
				EMIT('app_nowiki', app);
				return;
			}

			// markdown help
			SET('common.wiki', data.body.body || EMPTYARRAY);
			var is = common.wiki ? common.wiki.length > 0 : false;
			is && RECONFIGURE('wiki', { title: 'Wiki: ' + app.title || app.name });
			SET('common.wikishow', is);
			break;

		case 'changelog':

			if (!data.body.body) {
				EMIT('app_nochangelog', app);
				return;
			}

			// markdown help
			SET('common.wiki', data.body.body || EMPTYARRAY);
			var is = common.wiki ? common.wiki.length > 0 : false;
			is && RECONFIGURE('wiki', { title: 'Changelog: ' + app.title || app.name });
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
				// name: app.title || app.name
				common.console[id] = { icon: FUNC.icon(app.icon), items: [data.body] };
				all = true;
			} else
				common.console[id].items.unshift(data.body);

			if (common.console[id].items.length > 100)
				common.console[id].items = common.console[id].items.splice(0, 100);

			common.console[id].current = data.body;

			if (app.id === common.focused)
				SET('common.status', data.body);

			UPD('common.console' + (all ? '' : ('.' + id)));

			if (data.body.show) {
				SETTER('console/show', id);
				SET('common.consolewindow', true);
			}

			if (!common.consolewindow)
				INC('common.consolecount');

			break;

		case 'offline':
			var model = {};
			model.is = !!data.body;
			model.text = model.is ? data.body.markdown(MD_LINE) : '';
			EMIT('app_offline', app, model);
			break;

		case 'clipboard':
			SETTER('clipboard/copy', data.body);
			break;

		case 'mail':
			AJAX('POST /api/op/mail/', data.body, NOOP);
			break;

		case 'screenshot':
			SET('reportbugform.screenshot', data.body);
			break;

		case 'appearance':
			app.send('appearance', { darkmode: user.darkmode, colorscheme: user.colorscheme }, data.callback);
			break;

		case 'launched':
			var apps = [];
			for (var i = 0; i < user.apps.length; i++) {
				var item = user.apps[i];
				apps.push({ id: item.id, icon: FUNC.icon(item.icon), name: item.name, title: item.title, version: item.version, type: item.type });
			}
			app.send('launched', apps, data.callback);
			break;

		case 'verify':
		case 'meta':

			if (app && navigator.userAgent === data.body.ua) {

				var meta = {};
				meta.openplatformurl = location.origin;
				meta.name = app.name;
				meta.title = app.title;
				meta.icon = FUNC.icon(app.icon);
				meta.data = app.data;
				meta.width = app.iframe.width();
				meta.height = app.iframe.height();
				meta.dateformat = user.dateformat;
				meta.timeformat = user.timeformat;
				meta.numberformat = user.numberformat;
				meta.datefdow = user.datefdow;
				meta.darkmode = user.darkmode;
				meta.colorscheme = user.colorscheme;
				meta.userapps = [];
				meta.username = user.name;
				meta.query = NAV.query;

				for (var i = 0; i < user.apps.length; i++) {
					var item = user.apps[i];
					if (!item.internal) {
						var a = {};
						a.name = item.name;
						a.title = item.title;
						a.type = item.type;
						a.favorite = item.favorite;
						a.icon = FUNC.icon(item.icon);
						a.id = item.id;
						a.responsive = item.responsive;
						a.version = item.version;
						a.online = item.online;
						meta.userapps.push(a);
					}
				}

				meta.ww = WW;
				meta.wh = WH;
				meta.display = WIDTH();
				meta.oldversion = app.version;
				app.send('verify', meta, data.callback);

				if (data.type === 'verify')
					app.newversion && setTimeout(notify_changelog, 1000, app);
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
					if (!app.isrunning)
						return;
				}

				data.body.app = { id: app.id, name: app.name, type: app.type };
				EXEC('openplatform/open', target.id, data.body);
			}

			break;

		case 'progress':
			if (app) {
				var progress = data.body || 0;
				if (progress >= 100 || progress < 0)
					progress = 0;

				var key = 'progress_' + app.id;
				TEMP[key] && clearTimeout(TEMP[key]);
				TEMP[key] = setTimeout(notify_progress, 300, app, progress);
			}
			break;

		case 'menu':
			app.send('menu', null);
			break;

		case 'maximize':
			EMIT('app_maximize', app);
			break;

		case 'shake':
			EMIT('app_shake', app);
			break;

		case 'titlesuccess':
			EMIT('app_success', app, data.body);
			break;

		case 'titlewarning':
			EMIT('app_warning', app, data.body);
			break;

		case 'done':
			if (data.body instanceof Array) {
				FUNC.focus();
				FUNC.playsound('alert', app.id);
				SETTER('message/warning', '<div style="margin-bottom:10px;font-size:16px" class="b"><i class="{0} mr5"></i>{1}</div>'.format(FUNC.icon(app.icon), app.title) + data.body[0].error.markdown(MD_LINE));
			} else {
				FUNC.playsound('done', app.id);
				EMIT('app_success', app, data.body, true);
			}
			break;

		case 'focus':
			EMIT('app_click', app);
			SETTER('processes/focus', app);
			break;

		case 'restart':
			app.href = data.url;
			app.meta = null;
			UPD('user.apps');
			EMIT('app_restart', app);
			setTimeout(AEXEC('openplatform/open', app.id), 1000);
			break;

		case 'loading':
			var model = {};
			if (data.body && typeof(data.body) !== 'boolean') {
				model.is = data.body.show;
				model.text = (data.body.text || '').markdown(MD_LINE);
			} else
				model.is = data.body == true;
			EMIT('app_loading', app, model);
			break;

		case 'loading2':
			var model = {};
			model.is = data.body == true;
			app.isloading = model.is;
			EMIT('app_loading2', app, model);
			break;

		case 'snackbar':
			if (data.body.body instanceof Array)
				data.body.body = data.body.body[0].error;
			var model = {};
			model.type = data.body.type || 'success';
			model.body = data.body.body.markdown(MD_LINE);
			model.button = data.body.button;
			SETTER('snackbar/' + model.type, model.body, model.button);
			break;

		case 'config':

			var configcb = function(response, err) {
				data.callback && app.send('config', typeof(response) === 'string' ? PARSE(response) : response, data.callback, err);
			};

			if (data.body.body)
				DAPI('config_save/' + app.id, { body: data.body.body }, configcb);
			else
				DAPI('config_read/' + app.id, configcb);
			break;

		case 'message':

			if (data.body.body instanceof Array) {
				// error
				data.body.body = data.body.body[0].error;
			} else
				data.body.body = data.body.body.markdown(MD_NOTIFICATION);

			FUNC.focus();
			FUNC.playsound(data.body.type === 'warning' ? 'alert' : data.body.type === 'info' ? 'done' : 'success', app.id);
			SETTER('message/' + (data.body.type || 'success'), '<div style="margin-bottom:10px;font-size:16px" class="b"><i class="{0} mr5"></i>{1}</div>'.format(FUNC.icon(app.icon), app.title) + data.body.body, null, null, data.body.button);
			break;

		case 'confirm':
			FUNC.focus();
			FUNC.playsound('confirm', app.id);
			if (data.body.buttons.length === 1) {
				SETTER('approve/show', data.body.body.markdown(MD_NOTIFICATION), data.body.buttons[0], function() {
					app.send('confirm', { index: 0 }, data.callback);
				});
			} else {
				SETTER('confirm/show', data.body.body.markdown(MD_NOTIFICATION), data.body.buttons, function(index) {
					app.send('confirm', { index: index }, data.callback);
				});
			}
			break;

		case 'report':
			FUNC.focus();
			FUNC.reportbug(app.id, data.body.type, data.body.body, data.body.high);
			break;

		case 'play':
		case 'stop':

			if (!app.internal && !app.sounds)
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

			user.sounds && SETTER('audio/' + data.type, data.body);
			break;

		case 'badge':
			if ((data.body == null || data.body == false) && app.isfocused)
				return;
			DAPI('badge/' + app.id, NOOP);
			break;

		case 'notify':
			app.notifications && DAPI('notify/' + app.id, data.body, NOOP);
			break;

		case 'minimize':
			EMIT('app_minimize', app);
			break;

		case 'log':
			var model = {};
			model.appid = app.id;
			model.appurl = app.url;
			model.body = data.body;
			DAPI('logger', model);
			EMIT('app_logger', app, model);
			break;

		case 'open':
			var target = user.apps.findItem('id', data.body.id);
			if (target == null) {
				data.body.id = data.body.id.toLowerCase();
				for (var i = 0; i < user.apps.length; i++) {
					if (user.apps[i].name.toLowerCase() === data.body.id) {
						target = user.apps[i];
						break;
					}
				}
			}

			if (target) {
				EXEC('openplatform/open', target.id, data.body.body);
				EMIT('app_open', target);
			}

			break;

		case 'kill':
			app.meta = null;
			UPD('user.apps', 'kill');
			EMIT('app_kill', app);
			break;
	}
});