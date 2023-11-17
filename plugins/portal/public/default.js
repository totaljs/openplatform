COMPONENT('iframe', 'parent:auto;margin:23;gap:0;lrefresh:Refresh;ldetach:Detach;lclose:Close;lminimalize:Minimalize;lfeedback:Report a problem', function(self, config, cls) {

	var iframe;
	var header;

	self.readonly();

	self.make = function() {

		self.aclass(cls);
		var url = self.attrd('url');
		var icon = self.attrd('icon');
		var name = self.attrd('name');
		var scrollbar = self.attrd('scrollbar');
		var parent = self.parent(config.parent);
		var width = parent.width();
		var height = parent.height() - config.margin;

		self.html(('<div class="content ui-iframe-item"><div class="ui-iframe-header"><span class="close exec" data-exec="common/close" title="{lclose}"><i class="ti ti-times"></i></span><span class="refresh" title="{lrefresh}"><i class="ti ti-sync"></i></span><span class="detach" title="{ldetach}"><i class="ti ti-window"></i></span><span class="minimalize" title="{lminimalize}"><i class="ti ti-underscore"></i></span><span class="feedback" title="{lfeedback}"><i class="ti ti-bug feedback"></i></span><div><i class="{0}"></i>{1}</div></div><ifr' + 'ame src="{2}" frameborder="0" scrolling="{5}" allowtransparency="true" allow="geolocation *; microphone *; camera *; midi *; encrypted-media *" style="width:{3}px;height:{4}px"></ifr' + 'ame></div>').format(icon, name, url, width, height, scrollbar).arg(config));

		iframe = self.find('iframe');
		header = self.find('.ui-iframe-header');

		self.event('click', '.refresh', function() {
			iframe.attr('src', url);
			$(this).aclass('ti-spin').rclass('ti-spin', 1000);
		});

		self.event('click', '.feedback', function() {
			EXEC('common/feedback', ATTRD(self.element));
		});

		self.event('click', '.minimalize', function() {
			EXEC('common/open', 'welcome');
		});

		self.event('click', '.detach', function() {
			TOGGLE('common.detach.app' + ATTRD(self.element));
		});
	};

	self.restart = function() {
		iframe.attr('src', self.attrd('url'));
	};

	self.send = function(msg) {
		iframe[0].contentWindow.postMessage(STRINGIFY(msg), '*');
	};

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 300);
	};

	self.on('resize + resize2', self.resize);

	self.resizeforce = function() {
		var parent = self.parent(config.parent);
		var margin = self.closest('.ui-windows-body').length ? 0 : config.margin;
		iframe.css({ width: parent.width(), height: parent.height() - margin });
	};

});

COMPONENT('content', 'marginleft:15;marginright:15;margintop:15;marginbottom:70;parent:window', function(self, config, cls) {

	var init = false;

	self.readonly();

	self.make = function() {
		self.aclass(cls);
		self.resizeforce();
	};

	self.resizeforce = function() {

		var parent = self.parent(config.parent);
		var w = parent.width() - config.marginleft - config.marginright;
		var h = parent.height() - config.margintop - config.marginbottom;

		self.css({ width: w, height: h });

		if (!init) {
			self.rclass('invisible', 30);
			init = true;
		}

	};

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 10);
	};

});


// Modified
COMPONENT('parts', 'parent:auto;margin:0', function(self, config, cls) {

	var skip = false;
	var partw;
	var parth;

	self.readonly();

	self.make = function() {
		self.aclass(cls);
		self.on('resize + resize2', self.resize);
	};

	var itemreplace = function(item, content) {
		return ADAPT(item.path, item.id, content);
	};

	var itempath = function(item, path) {
		return path.replace(/\?/g, item.scope || item.path || item.id || '?');
	};

	self.focus = function(id, fromsetter) {

		var is = false;
		var model = self.get();
		var classname = cls + '-focused';
		var selected = model.findItem('id', id);

		if (fromsetter && selected) {
			if (selected.element.hclass(classname))
				return;
		}

		var item = model.findItem('focused', true);
		if (item && item.id !== id) {
			is = true;
			item.focused = false;
			item.element.rclass(classname);
			item.blur && self.EXEC(itempath(item, item.blur), item.element, item);
		}

		item = selected;
		if (item) {

			if (!item.element.hclass(classname)) {
				item.focused = true;
				item.element.aclass(classname);
				is = true;
			}

			item.reload && self.EXEC(itempath(item, item.reload), item.element, item);
			item.focus && self.EXEC(itempath(item, item.focus), item.element, item);
		}

		if (is) {
			skip = true;
			self.update(true);
		}

		config.hideon && NUL(config.hideon);
	};

	self.unfocus = function() {
		var model = self.get();
		var classname = cls + '-focused';
		var item = model.findItem('focused', true);
		if (item) {
			item.focused = false;
			item.element.rclass(classname);
			item.blur && self.EXEC(itempath(item, item.blur), item.element, item);
			self.update(true);
		}
	};

	self.rename = function(id, name, icon) {
		var model = self.get();
		var item = model.findItem('id', id);
		if (item) {
			if (name)
				item.name = name;
			if (icon)
				item.icon = icon;
			skip = true;
			self.update(true);
		}
	};

	self.close = function(id) {

		var model = self.get();
		if (id == null) {
			for (var item of model)
				self.close(item.id);
			return;
		}

		var item = model.findItem('id', id);
		if (item) {
			var index = model.indexOf(item);
			model.splice(index, 1);

			if (item.focused) {
				// next part to focus
				var next = model[index];
				if (!next)
					next = model[0];
				next && setTimeout(self.focus, 5, next.id);
			}

			skip = true;
			self.update(true);
			item.remove && self.EXEC(itempath(item, item.remove), item.element, item);
			item.element.remove();
			setTimeout2(self.ID + 'free', FREE, 1000);
		}
	};

	self.create = function(item) {

		if (item.processed)
			return;

		item.processed = true;
		var div = $('<div></div>');
		div.aclass(cls + '-item invisible');
		div.attrd('id', item.id);

		if (item.attr) {
			for (var key in item.attr)
				div.attr(key, item.attr[key]);
		}

		if (item.attrd) {
			for (var key in item.attrd)
				div.attrd(key, item.attrd[key]);
		}

		if (parth || partw)
			div.css({ width: partw, height: parth });

		if (item.import) {
			IMPORT(item.import, div, function() {
				item.init && self.EXEC(itempath(item, item.init), div, item);
				setTimeout2(self.ID + 'focus', self.focus, 100, null, item.id);
				div.rclass('invisible', item.delay || 10);
				item.import = null;
			}, true, function(content) {
				return itemreplace(item, content);
			});
		} else if (div.html) {
			div.append(itemreplace(item, item.html));
			item.html.COMPILABLE() && setTimeout(COMPILE, 1, div);
		}

		div[0].$part = item;
		item.element = div;
		config.create && self.EXEC(config.create, item);
		self.append(div);

		if (!item.import) {
			setTimeout2(self.ID + 'focus', self.focus, 100, null, item.id);
			div.rclass('invisible', item.delay || 10);
			item.init && self.EXEC(true, itempath(item, item.init), div, item);
		}
	};

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 300);
	};

	self.resizeforce = function() {
		self.element.SETTER('*/resize');
	};

	config.hideon && self.datasource(config.hideon, function(path, value) {
		if (value)
			self.unfocus();
		self.tclass('masked', !!value);
	});

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		var model = value || EMPTYARRAY;

		for (var item of model) {
			self.create(item);
			item.focused && self.focus(item.id);
		}

		// Clean ghosts
		var div = self.find('> div').toArray();
		for (var i = 0; i < div.length; i++) {
			var el = $(div[i]);
			if (!model.findItem('id', el.attrd('id'))) {
				var obj = div[i].$part;
				if (obj) {
					obj.remove && self.EXEC(itempath(obj, obj.remove), obj.element, obj);
					obj.element.remove();
				}
			}
		}

		self.resize();
	};

	var findiframe = function(item) {
		iframe = item.element.find('iframe')[0];
		if (!iframe)
			iframe = $('.ui-windows-item[data-id="app{0}"] iframe'.format(item.id))[0];
		return iframe;
	};

	self.send = function(name, msg) {
		var model = self.get();
		var iframe;
		if (typeof(name) === 'string') {
			// To a specific app
			var item = model.findItem('id', name);
			if (item && !item.root) {
				iframe = findiframe(item);
				iframe && iframe.contentWindow.postMessage(STRINGIFY(msg), '*');
			}
		} else {
			// To all open apps
			msg = name;
			for (var item of model) {
				if (!item.root) {
					iframe = findiframe(item);
					iframe && iframe.contentWindow.postMessage(STRINGIFY(msg), '*');
				}
			}
		}
	};

});

$(W).on('message', function(e) {

	var source = e.originalEvent.source;
	var app;
	var iframe;

	for (var m of common.running) {

		if (m.root)
			continue;

		iframe = m.element.find('iframe');

		if (!iframe[0])
			iframe = $('.ui-windows-item[data-id="app{0}"] iframe'.format(m.id));

		if (iframe[0] && iframe[0].contentWindow === source) {
			app = m;
			break;
		}
	}

	if (!app)
		return;

	var msg = e.originalEvent ? e.originalEvent.data : '';

	msg = PARSE(msg);

	if (!app) {
		// Not found
		return;
	}

	switch (msg.TYPE) {
		case 'init':
			var win = iframe[0].contentWindow;
			win.postMessage(STRINGIFY({ TYPE: 'init' }), '*');
			win.postMessage(STRINGIFY({ TYPE: 'appearance', data: { color: user.color, sounds: user.sounds, notifications: user.notifications }}), '*');
			var path = common.paths[app.id];
			path && setTimeout(win => win.postMessage(STRINGIFY({ TYPE: 'path', data: path }), '*'), 50, win);
			break;

		case 'feedback':
			EXEC('common/feedback', app.id);
			break;

		case 'refresh':
		case 'refresh_account':
			EXEC('common/' + msg.TYPE);
			break;

		case 'path':
			var path = msg.data;
			if (app.focused)
				location.hash = app.linker + (path ? ('~' + path) : '');
			common.paths[app.id] = path;
			break;

		case 'play':
			EXEC('-sounds/play', msg.data);
			break;

		case 'clipboard':
			EXEC('-clipboard/copy', msg.data);
			break;

		case 'warning':
			EXEC('-notify/warning', msg.data);
			EXEC('-sounds/play', 'badges');
			break;

		case 'success':
			EXEC('-notify/success', msg.data);
			EXEC('-sounds/play', 'badges');
			break;

		case 'error':
			EXEC('-message/warning', msg.data);
			EXEC('-sounds/play', 'alert');
			break;

		case 'nextwindow':
			EXEC('common/nextwindow', app.id);
			break;

		case 'focus':

			if (!msg.data)
				EXEC('-sounds/confirm');

			var win = common.windows.findItem('id', 'app' + app.id);
			win && EXEC('-windows/focus', win.id);

			if (!app.focused)
				EXEC('-parts/focus', app.id);

			return;

		case 'restart':
			var com = app.element.find('ui-component');
			com.find('iframe').attr('src', com.attrd('url'));
			return;

		case 'close':
			EXEC('-parts/close', app.id);
			return;

		case 'quicksearch':
			EXEC('common/search');
			return;
	}
});

COMPONENT('time', 'icon:ti ti-clock', function(self, config, cls) {

	var is = true;
	var fn;

	self.make = function() {

		self.aclass(cls);
		self.append((config.icon ? '<i class="{0}"></i>'.format(config.icon) : '') + '<span></span>');

		var span = self.find('span');
		var format = (config.format || DEF.timeformat || 'HH:mm');
		var t12 = format.indexOf('a') !== -1;

		if (t12)
			format = format.replace(/a/, '').trim();

		format += ':ss' + (t12 ? ' a' : '');

		fn = function() {
			if (is) {
				NOW = new Date();
				var tf = format;
				if (NOW.getSeconds() % 2 === 0)
					tf = tf.replace(/:/g, ' ');
				span.html(NOW.format(tf));
			}
		};

		setInterval(fn, 1000);
		fn();
	};

	self.setter = function(value) {
		is = value === config.if;
		is && fn();
	};
});