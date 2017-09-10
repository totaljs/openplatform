COMPONENT('checkbox', function(self, config) {

	self.validate = function(value) {
		return (config.disabled || !config.required) ? true : (value === true || value === 'true' || value === 'on');
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'label':
				self.find('span').html(value);
				break;
			case 'required':
				self.find('span').tclass('ui-checkbox-label-required', value);
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				break;
			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;
		}
	};

	self.make = function() {
		self.aclass('ui-checkbox');
		self.html('<div><i class="fa fa-{2}"></i></div><span{1}>{0}</span>'.format(config.label || self.html(), config.required ? ' class="ui-checkbox-label-required"' : '', config.checkicon || 'check'));
		self.event('click', function() {
			if (config.disabled)
				return;
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.toggle('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function(self, config) {

	var select, container, condition, content, datasource = null;
	var render = '';

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		var type = typeof(value);
		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'currency':
			case 'number':
				return value > 0;
		}

		return value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'type':
				self.type = value;
				break;
			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];

				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var obj = { id: item[1] == null ? item[0] : item[1], name: item[0] };
					items.push(obj);
				});

				self.bind('', items);
				break;
			case 'condition':
				condition = value ? FN(value) : null;
				break;
			case 'required':
				self.find('.ui-dropdown-label').tclass('ui-dropdown-label-required', value);
				self.state(1, 1);
				break;
			case 'datasource':
				datasource && self.unwatch(value, self.bind);
				self.watch(value, self.bind, true);
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'icon':
				redraw = true;
				break;
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('select').prop('disabled', value);
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', 100);
	};

	self.bind = function(path, arr) {

		if (!arr)
			arr = EMPTYARRAY;

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = config.text || 'name';
		var propValue = config.value || 'id';

		config.empty !== undefined && builder.push('<option value="">{0}</option>'.format(config.empty));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];

			if (condition && !condition(item))
				continue;

			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		render = builder.join('');
		select.html(render);
	};

	self.redraw = function() {
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-jc-bind="">{0}</select></div>'.format(render);
		var builder = [];
		var label = content || config.label;
		if (label) {
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(config.required ? ' ui-dropdown-label-required' : '', config.icon ? '<span class="fa fa-{0}"></span> '.format(config.icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).aclass('ui-dropdown-values');
		select = self.find('select');
		container = self.find('.ui-dropdown');
		render && self.refresh();
		config.disabled && self.reconfigure('disabled:true');
	};

	self.make = function() {
		config.condition && self.reconfigure('condition:' + config.condition);
		self.type = config.type;
		content = self.html();
		self.aclass('ui-dropdown-container');
		self.redraw();
		config.items && self.reconfigure({ items: config.items });
		config.datasource && self.reconfigure('datasource:' + config.datasource);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-dropdown-invalid', invalid);
	};
});

COMPONENT('textbox', function(self, config) {

	var input, container, content = null;

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return config.validation ? self.evaluate(value, config.validation, true) ? true : false : value.length > 0;
	};

	self.make = function() {

		content = self.html();

		self.type = config.type;
		self.format = config.format;

		self.event('click', '.fa-calendar', function(e) {
			if (config.disabled)
				return;
			if (config.type === 'date') {
				e.preventDefault();
				window.$calendar && window.$calendar.toggle(self.element, self.get(), function(date) {
					self.set(date);
				});
			}
		});

		self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			if (config.disabled)
				return;
			if (config.increment) {
				var el = $(this);
				var inc = el.hasClass('fa-caret-up') ? 1 : -1;
				self.change(true);
				self.inc(inc);
			}
		});

		self.event('click', '.ui-textbox-control-icon', function() {
			if (config.disabled)
				return;
			if (self.type === 'search') {
				self.$stateremoved = false;
				$(this).rclass('fa-times').aclass('fa-search');
				self.set('');
			}
		});

		self.redraw();
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		if (config.type === 'password')
			tmp = 'password';
		else
			tmp = 'text';

		self.tclass('ui-disabled', config.disabled === true);
		self.type = config.type;
		attrs.attr('type', tmp);
		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.keypress != null && attrs.attr('data-jc-keypress', config.keypress);
		config.delay && attrs.attr('data-jc-keypress-delay', config.delay);
		config.disabled && attrs.attr('disabled');
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');

		config.autofill && attrs.attr('name', self.path.replace(/\./g, '_'));
		config.align && attrs.attr('class', 'ui-' + config.align);
		config.autofocus && attrs.attr('autofocus');

		builder.push('<input {0} />'.format(attrs.join(' ')));

		var icon = config.icon;
		var icon2 = config.icon2;

		if (!icon2 && self.type === 'date')
			icon2 = 'calendar';
		else if (self.type === 'search') {
			icon2 = 'search ui-textbox-control-icon';
			self.setter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').tclass('fa-times', value ? true : false).tclass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa fa-{0}"></span></div>'.format(icon2));
		config.increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (config.label)
			content = config.label;

		if (content.length) {
			var html = builder.join('');
			builder = [];
			builder.push('<div class="ui-textbox-label{0}">'.format(config.required ? ' ui-textbox-label-required' : ''));
			icon && builder.push('<span class="fa fa-{0}"></span> '.format(icon));
			builder.push(content);
			builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.html(builder.join(''));
			self.aclass('ui-textbox-container');
			input = self.find('input');
			container = self.find('.ui-textbox');
		} else {
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.element;
		}
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.find('.ui-textbox-label').tclass('ui-textbox-label-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'autofill':
				input.prop('name', value ? self.path.replace(/\./g, '_') : '');
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'type':
				self.type = value;
				if (value === 'password')
					value = 'password';
				else
					self.type = 'text';
				redraw = true;
				break;
			case 'align':
				input.rclass(input.attr('class')).aclass('ui-' + value || 'left');
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'icon':
			case 'icon2':
			case 'increment':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.formatter(function(path, value) {
		if (config.type === 'date')
			return value ? value.format(config.format || 'yyyy-MM-dd') : value;
		return value;
	});

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textbox-invalid', invalid);
		config.error && self.find('.ui-box-helper').tclass('ui-box-helper-show', invalid);
	};
});

COMPONENT('binder', function(self) {

	var keys, keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path) {
		var mapper = keys[path];

		if (!mapper)
			return;

		var template = {};

		for (var i = 0, length = mapper.length; i < length; i++) {
			var item = mapper[i];
			var value = GET(item.path);
			var element = item.selector ? item.element.find(item.selector) : item.element;
			template.value = value;
			item.classes && classes(element, item.classes(value));

			var is = true;

			if (item.visible) {
				is = item.visible(value) ? true : false;
				element.tclass('hidden', !is);
			}

			if (is) {
				item.html && element.html(item.Ta ? item.html(template) : item.html(value));
				item.disable && element.prop('disabled', item.disable(value));
				item.src && element.attr('src', item.src(value));
			}
		}
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.rclass(rem);
		add && element.aclass(add);
	}

	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.prepare = function(code) {
		return code.indexOf('=>') === -1 ? FN('value=>' + decode(code)) : FN(decode(code));
	};

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attrd('b').replace('%', 'jctmp.');
			var arr = path.split('.');
			var p = '';

			var classes = el.attrd('b-class');
			var html = el.attrd('b-html');
			var visible = el.attrd('b-visible');
			var disable = el.attrd('b-disable');
			var selector = el.attrd('b-selector');
			var src = el.attrd('b-src');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? self.prepare(classes) : undefined;
				obj.visible = visible ? self.prepare(visible) : undefined;
				obj.disable = disable ? self.prepare(disable) : undefined;
				obj.selector = selector ? selector : null;
				obj.src = src ? self.prepare(src) : undefined;

				if (el.attr('data-b-template') === 'true') {
					var tmp = el.find('script[type="text/html"]');
					var str = '';

					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.html = Tangular.compile(str);
						obj.Ta = true;
						tmp.length && tmp.remove();
					}
				} else
					obj.html = html ? self.prepare(html) : undefined;

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}
		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, GET(key));
		});

		return self;
	};
});

COMPONENT('exec', function(self, config) {
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', config.selector || '.exec', function(e) {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el, e);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('error', function(self, config) {

	self.readonly();

	self.make = function() {
		self.aclass('ui-error hidden');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			self.tclass('hidden', true);
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<div><span class="fa {1}"></span>{0}</div>'.format(value[i].error, 'fa-' + (config.icon || 'times-circle')));

		self.html(builder.join(''));
		self.tclass('hidden', false);
	};
});

COMPONENT('page', function(self, config) {

	var type = 0;

	self.readonly();

	self.hide = function() {
		self.set('');
	};

	self.setter = function(value) {

		if (type === 1)
			return;

		var is = config.if == value;

		if (type === 2 || !is) {
			self.tclass('hidden', !is);
			is && config.reload && EXEC(config.reload);
			self.release(!is);
			EMIT('resize');
			return;
		}

		SETTER('loading', 'show');
		type = 1;

		self.import(config.template, function() {
			type = 2;

			if (config.init) {
				var fn = GET(config.init || '');
				typeof(fn) === 'function' && fn(self);
			}

			config.reload && EXEC(config.reload);

			setTimeout(function() {
				self.tclass('hidden', !is);
				EMIT('resize');
			}, 200);

			SETTER('loading', 'hide', 1000);
		}, false);
	};
});

COMPONENT('validation', function(self, config) {

	var path, elements = null;
	var def = 'button[name="submit"]';

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector || def);
		path = self.path.replace(/\.\*$/, '');
		setTimeout(function() {
			self.watch(self.path, self.state, true);
		}, 50);
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'selector':
				elements = self.find(value || def);
				break;
		}
	};

	self.state = function() {
		var disabled = MAIN.disabled(path);
		if (!disabled && config.if)
			disabled = !EVALUATE(self.path, config.if);
		elements.prop('disabled', disabled);
	};
});

COMPONENT('websocket', 'reconnect:2000', function(self, config) {

	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();

	self.make = function() {
		url = config.url || '';
		if (!url.match(/^(ws|wss)\:\/\//))
			url = (location.protocol.length === 6 ? 'wss' : 'ws') + '://' + location.host + (url.substring(0, 1) !== '/' ? '/' : '') + url;
		setTimeout(self.connect, 500);
		self.destroy = self.close;
	};

	self.send = function(obj) {
		queue.push(encodeURIComponent(JSON.stringify(obj)));
		self.process();
		return self;
	};

	self.process = function(callback) {

		if (!ws || sending || !queue.length || ws.readyState !== 1) {
			callback && callback();
			return;
		}

		sending = true;
		var async = queue.splice(0, 3);
		async.waitFor(function(item, next) {
			ws.send(item);
			setTimeout(next, 5);
		}, function() {
			callback && callback();
			sending = false;
			queue.length && self.process();
		});
	};

	self.close = function(isClosed) {
		if (!ws)
			return self;
		self.online = false;
		ws.onopen = ws.onclose = ws.onmessage = null;
		!isClosed && ws.close();
		ws = null;
		EMIT('online', false);
		return self;
	};

	function onClose() {
		self.close(true);
		setTimeout(self.connect, config.reconnect);
	}

	function onMessage(e) {
		var data;
		try {
			data = PARSE(decodeURIComponent(e.data));
			self.attrd('jc-path') && self.set(data);
		} catch (e) {
			WARN('WebSocket "{0}": {1}'.format(url, e.toString()));
		}
		data && EMIT('message', data);
	}

	function onOpen() {
		self.online = true;
		self.process(function() {
			EMIT('online', true);
		});
	}

	self.connect = function() {
		ws && self.close();
		setTimeout2(self.id, function() {
			ws = new WebSocket(url);
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('form', function(self, config) {

	var W = window;
	var header = null;
	var csspos = {};

	if (!W.$$form) {
		W.$$form_level = W.$$form_level || 1;
		W.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attr('data-path'), '');
			W.$$form_level--;
		});

		$(window).on('resize', function() {
			SETTER('form', 'resize');
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hclass('ui-form-container-padding') || el.hclass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.aclass(cls);
			setTimeout(function() {
				form.rclass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self);
		self.hide();
	};

	self.hide = function() {
		self.set('');
	};

	self.resize = function() {
		if (!config.center || self.hclass('hidden'))
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(W).height();
		var r = (wh / 2) - (fh / 2);
		csspos.marginTop = (r > 30 ? (r - 15) : 20) + 'px';
		ui.css(csspos);
	};

	self.make = function() {

		var icon;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);
		else
			icon = '<i></i>';

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}px"><div class="ui-form-title"><button class="ui-form-button-close" data-path="{2}"><i class="fa fa-times"></i></button>{4}<span>{3}</span></div></div></div>'.format(self._id, config.width || 800, self.path, config.title, icon));

		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.rclass('hidden');
		self.replace(el);

		header = self.virtualize({ title: '.ui-form-title > span', icon: '.ui-form-title > i' });

		self.event('scroll', function() {
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
			W.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(self.hide);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		switch (key) {
			case 'icon':
				header.icon.rclass(header.icon.attr('class'));
				value && header.icon.aclass('fa fa-' + value);
				break;
			case 'title':
				header.title.html(value);
				break;
			case 'width':
				value !== prev && self.find('.ui-form').css('max-width', value + 'px');
				break;
		}
	};

	self.setter = function(value) {

		setTimeout2('noscroll', function() {
			$('html').tclass('noscroll', $('.ui-form-container').not('.hidden').length ? true : false);
		}, 50);

		var isHidden = value !== config.if;

		self.toggle('hidden', isHidden);

		setTimeout2('formreflow', function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			self.release(true);
			self.find('.ui-form').rclass('ui-form-animate');
			return;
		}

		self.resize();
		self.release(false);

		config.reload && EXEC(config.reload, self);

		if (!isMOBILE && config.autofocus) {
			var el = self.find(config.autofocus === true ? 'input[type="text"],select,textarea' : config.autofocus);
			el.length && el.eq(0).focus();
		}

		if (W.$$form_level < 1)
			W.$$form_level = 1;

		W.$$form_level++;
		self.css('z-index', W.$$form_level * 10);
		self.element.scrollTop(0);

		setTimeout(function() {
			self.find('.ui-form').aclass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.id, function() {
			self.css('z-index', (W.$$form_level * 10) + 1);
		}, 1000);
	};
});

COMPONENT('confirm', function(self) {

	var is, visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {

		self.aclass('ui-confirm hidden');

		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'DIV')
				return;
			var el = self.find('.ui-confirm-body');
			el.aclass('ui-confirm-click');
			setTimeout(function() {
				el.rclass('ui-confirm-click');
			}, 300);
		});

		$(window).on('keydown', function(e) {
			if (!visible)
				return;
			var index = e.which === 13 ? 0 : e.which === 27 ? 1 : null;
			if (index != null) {
				self.find('button[data-index="{0}"]'.format(index)).trigger('click');
				e.preventDefault();
			}
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.rclass('ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.rclass('hidden');
		setTimeout2(self.id, function() {
			visible = true;
			self.aclass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function(self) {

	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-loading');
		self.append('<div></div>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.rclass('hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.aclass('hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('grid', 'filter:true;external:false;filterlabel:Filtering values ...;boolean:true|on|yes;pluralizepages:# pages,# page,# pages,# pages;pluralizeitems:# items,# item,# items,# items;pagination:false', function(self, config) {

	var tbody, thead, tbodyhead, container, pagination;
	var options = { columns: {}, items: [], indexer: 0, filter: {} };
	var isFilter = false;
	var ppages, pitems, cache, eheight;

	self.template = Tangular.compile('<td data-index="{{ index }}"{{ if $.class }} class="{{ $.class }}"{{ fi }}><div class="wrap{{ if align }} {{ align }}{{ fi }}"{{ if background }} style="background-color:{{ background }}"{{ fi }}>{{ value | raw }}</div></td>');
	self.options = options;
	self.readonly();

	self.make = function() {

		var meta = self.find('script').html();
		self.aclass('ui-grid-container');
		self.html('<div class="ui-grid"><table class="ui-grid-header"><thead></thead></table><div class="ui-grid-scroller"><table class="ui-grid-data"><thead></thead><tbody></tbody></table></div></div>' + (config.pagination ? '<div class="ui-grid-footer"><div class="ui-grid-meta"></div><div class="ui-grid-pagination"><button class="ui-grid-button" name="first"><i class="fa fa-angle-double-left"></i></button><button class="ui-grid-button" name="prev"><i class="fa fa-angle-left"></i></button><div class="page"><input type="text" maxlength="5" class="ui-grid-input" /></div><button class="ui-grid-button" name="next"><i class="fa fa-angle-right"></i></button><button class="ui-grid-button" name="last"><i class="fa fa-angle-double-right"></i></button></div><div class="ui-grid-pages"></div></div></div>' : ''));

		var body = self.find('.ui-grid-data');
		tbody = $(body.find('tbody').get(0));
		tbodyhead = $(body.find('thead').get(0));
		thead = $(self.find('.ui-grid-header').find('thead').get(0));
		container = $(self.find('.ui-grid-scroller').get(0));
		pagination = config.pagination ? VIRTUALIZE(self.find('.ui-grid-footer'), { page: 'input', first: 'button[name="first"]', last: 'button[name="last"]', prev: 'button[name="prev"]', next: 'button[name="next"]', meta: '.meta', pages: '.pages' }) : null;
		meta && self.meta(meta);
		config.init && EXEC(config.init);

		self.event('click', '.ui-grid-columnsort', function() {
			var obj = {};
			obj.columns = options.columns;
			obj.column = options.columns[+$(this).attr('data-index')];
			self.sort(obj);
		});

		self.event('change', '.ui-grid-filter', function() {
			var el = $(this).parent();
			if (this.value)
				options.filter[this.name] = this.value;
			else
				delete options.filter[this.name];
			el.tclass('ui-grid-selected', this.value ? true : false);
			self.filter();
		});

		self.event('click', '.ui-grid-button', function() {
			switch (this.name) {
				case 'first':
					cache.page = 1;
					self.operation('pagination');
					break;
				case 'last':
					cache.page = cache.pages;
					self.operation('pagination');
					break;
				case 'prev':
					cache.page -= 1;
					self.operation('pagination');
					break;
				case 'next':
					cache.page += 1;
					self.operation('pagination');
					break;
			}
		});

		self.event('change', '.ui-grid-input', function() {
			var page = (+this.value) >> 0;
			if (isNaN(page) || page < 0 || page > cache.pages || page === cache.page)
				return;
			cache.page = page;
			self.operation('pagination');
		});

		self.on('resize', self.resize);
	};

	self.meta = function(html) {
		switch (typeof(html)) {
			case 'string':
				options.columns = new Function('return ' + html.trim())();
				break;
			case 'function':
				options.columns = html(self);
				break;
			case 'object':
				options.columns = html;
				break;
		}

		for (var i = 0; i < options.columns.length; i++) {
			var column = options.columns[i];
			if (typeof(column.template) === 'string')
				column.template = column.template.indexOf('{{') === -1 ? new Function('a', 'b', 'return \'' + column.template + '\'') : Tangular.compile(column.template);
		}

		self.rebuild(true);
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'pluralizepages':
				ppages = value.split(',').trim();
				break;
			case 'pluralizeitems':
				pitems = value.split(',').trim();
				break;
		}
	};

	self.rebuild = function(init) {

		var data = ['<tr class="ui-grid-empty">'];
		var header = ['<tr>'];
		var filter = ['<tr>'];

		var size = 0;
		var columns = options.columns;

		for (var i = 0, length = columns.length; i < length; i++) {
			var col = columns[i];
			size += col.size || 1;
			col.sorting = null;
			if (typeof(col.render) === 'string')
				col.render = FN(col.render);
		}

		for (var i = 0, length = columns.length; i < length; i++) {
			var col = columns[i];
			var width = (((col.size || 1) / size) * 100).floor(2);
			data.push('<td style="width:{0}%" data-index="{1}" class="{2}"></td>'.format(width, i, col.class ? ' ' + col.class : ''));
			header.push('<th class="ui-grid-columnname{3}{5}" style="width:{0}%;text-align:center" data-index="{1}" title="{6}" data-name="{4}"><div class="wrap"><i class="fa hidden"></i>{2}</div></th>'.format(width, i, col.text || col.name, col.class ? ' ' + col.class : '', col.name, col.sort === false ? '' : ' ui-grid-columnsort', col.title || col.text || col.name));
			if (col.filter === false)
				filter.push('<th class="ui-grid-columnfilterempty ui-grid-columnfilter{1}" style="width:{0}%">&nbsp;</th>'.format(width, col.class ? ' ' + col.class : ''));
			else
				filter.push('<th class="ui-grid-columnfilter{4}" style="width:{0}%"><input type="text" placeholder="{3}" name="{2}" autocomplete="off" class="ui-grid-filter" /></th>'.format(width, i, col.name, col.filter || config.filterlabel, col.class ? ' ' + col.class : ''));
		}

		tbodyhead.html(data.join('') + '</tr>');
		thead.html(header.join('') + '</tr>' + (config.filter ? (filter.join('') + '</tr>') : ''));
		!init && self.refresh();
		isFilter = false;
		options.filter = {};
	};

	self.fill = function(count) {

		if (config.autosize === false)
			return;

		tbody.find('.emptyfill').remove();
		var builder = ['<tr class="emptyfill">'];

		var cols = options.columns;
		for (var i = 0, length = cols.length; i < length; i++) {
			if (!cols[i].hidden)
				builder.push('<td{0}>'.format(cols[i].class ? (' class="' + cols[i].class + '"') : '') + (i ? '' : '<div class="wrap">&nbsp;</div>') + '</td>');
		}

		builder.push('</tr>');
		builder = builder.join('');
		var buffer = [];
		for (var i = 0; i < count; i++)
			buffer.push(builder);
		tbody.append(buffer.join(''));
	};

	self.resize = function() {

		if (config.autosize === false)
			return;

		var value = options.items;
		var parent = self.parent();
		var height = parent.height() - (config.padding || 0);

		if (height === eheight)
			return;

		container.height(height - (config.pagination ? 124 : 74));
		eheight = height;

		var count = (height / 32) >> 0;
		if (count > value.length) {
			self.fill((count + 1) - value.length);
			container.aclass('ui-grid-noscroll');
		} else
			container.rclass('ui-grid-noscroll');
	};

	self.filter = function() {
		isFilter = Object.keys(options.filter).length > 0;
		!config.external && self.refresh();
		self.operation('filter');
	};

	self.operation = function(type) {
		config.exec && EXEC(config.exec, type, isFilter ? options.filter : null, options.lastsort ? options.lastsort : null, cache.page);
	};

	self.sort = function(data) {

		options.lastsortelement && options.lastsortelement.rclass('fa-caret-down fa-caret-up').aclass('hidden');

		if (data.column.sorting === 'desc') {
			options.lastsortelement.find('.fa').rclass('fa-caret-down fa-caret-up').aclass('hidden');
			options.lastsortelement = null;
			options.lastsort = null;
			data.column.sorting = null;

			if (config.external)
				self.operation('sort');
			else
				self.refresh();

		} else if (data.column) {
			data.column.sorting = data.column.sorting === 'asc' ? 'desc' : 'asc';
			options.lastsortelement = thead.find('th[data-name="{0}"]'.format(data.column.name)).find('.fa').rclass('hidden').tclass('fa-caret-down', data.column.sorting === 'asc').tclass('fa-caret-up', data.column.sorting === 'desc');
			options.lastsort = data.column;

			var name = data.column.name;
			var sort = data.column.sorting;


			!config.external && options.lastsort && options.items.quicksort(name, sort === 'asc');
			self.operation('sort');
			self.redraw();
		}
	};

	self.can = function(row) {

		var keys = Object.keys(options.filter);
		var cache = {};

		for (var i = 0; i < keys.length; i++) {

			var column = keys[i];
			var val = row[column];
			var filter = options.filter[column];
			var type = typeof(val);
			var val2 = cache[column];

			if (type === 'number') {

				if (val2 == null)
					val2 = cache[column] = self.parseNumber(filter);

				if (val2.length === 1 && val !== val2[0])
					return false;

				if (val < val2[0] || val > val2[1])
					return false;

			} else if (type === 'string') {

				if (val2 == null) {
					val2 = cache[column] = filter.split(/\/\|\\|\,/).trim();
					for (var j = 0; j < val2.length; j++)
						val2[j] = val2[j].toSearch();
				}

				var is = false;
				var s = val.toSearch();

				for (var j = 0; j < val2.length; j++) {
					if (s.indexOf(val2[j]) !== -1) {
						is = true;
						break;
					}
				}

				if (!is)
					return false;

			} else if (type === 'boolean') {
				if (val2 == null)
					val2 = cache[column] = config.boolean.indexOf(filter.replace(/\s/g, '')) !== -1;
				if (val2 !== val)
					return false;
			} else if (val instanceof Date) {

				val.setHours(0);
				val.setMinutes(0);

				if (val2 == null) {
					val2 = filter.trim().split(/\/|\||\\|\,/).trim();
					var arr = cache[column] = [];
					for (var j = 0; j < val2.length; j++) {
						var dt = val2[j].trim();
						var a = self.parseDate(dt);
						if (a instanceof Array) {
							arr.push(a[0]);
							if (j === val2.length - 1) {
								arr.push(a[1]);
								break;
							}
						} else
							arr.push(a);
					}
					val2 = arr;
				}

				if (val2.length === 1 && val.format('yyyyMMdd') !== val2[0].format('yyyyMMdd'))
					return false;
				if (val < val2[0] || val > val2[1])
					return false;
			} else
				return false;
		}

		return true;
	};

	self.parseDate = function(val) {
		var index = val.indexOf('.');
		if (index === -1) {
			if ((/[a-z]+/).test(val)) {
				var dt = DATETIME.add(val);
				return dt > DATETIME ? [DATETIME, dt] : [dt, DATETIME];
			}
			if (val.length === 4)
				return [new Date(+val, 1, 1), new Date(+val + 1, 1, 1)];
		} else if (val.indexOf('.', index + 1) === -1) {
			var a = val.split('.');
			return new Date(DATETIME.getFullYear(), +a[1] - 1, +a[0]);
		}
		index = val.indexOf('-');
		if (index !== -1 && val.indexOf('-', index + 1) === -1) {
			var a = val.split('-');
			return new Date(DATETIME.getFullYear(), +a[0] - 1, +a[1]);
		}
		return val.parseDate();
	};

	self.parseNumber = function(val) {
		var arr = [];
		var num = val.replace(/\s/g, '').replace(/\,/g, '.').split(/\/|\||\\/).trim();

		for (var i = 0, length = num.length; i < length; i++) {
			var n = num[i];
			arr.push(+n);
		}

		return arr;
	};

	self.reset = function() {
		options.filter = {};
		isFilter = false;
		thead.find('input').val('');
		thead.find('.ui-grid-selected').rclass('ui-grid-selected');
		options.lastsortelement && options.lastsortelement.rclass('fa-caret-down fa-caret-up');
		options.lastsortelement = null;
		if (options.lastsort)
			options.lastsort.sorting = null;
		options.lastsort = null;
	};

	self.redraw = function() {

		var items = options.items;
		var columns = options.columns;
		var builder = [];
		var m = {};

		for (var i = 0, length = items.length; i < length; i++) {
			builder.push('<tr class="ui-grid-row" data-index="' + i + '">');
			for (var j = 0, jl = columns.length; j < jl; j++) {
				var column = columns[j];
				var val = items[i][column.name];
				m.value = column.template ? column.template(items[i], column) : column.render ? column.render(val, column, items[i]) : val == null ? '' : (column.format ? val.format(column.format) : val);
				m.index = j;
				m.align = column.align;
				m.background = column.background;
				builder.push(self.template(m, column));
			}
			builder.push('</tr>');
		}

		tbody.html(builder.join(''));
		container.rclass('noscroll');

		eheight = 0;
		self.resize();
		setTimeout(self.resize, 500);
	};

	self.setter = function(value) {

		// value.items
		// value.limit
		// value.page
		// value.pages
		// value.count

		if (!value) {
			tbody.empty();
			self.resize();
			return;
		}

		cache = value;

		if (config.pagination) {
			pagination.prev.prop('disabled', value.page === 1);
			pagination.first.prop('disabled', value.page === 1);
			pagination.next.prop('disabled', value.page >= value.pages);
			pagination.last.prop('disabled', value.page === value.pages);
			pagination.page.val(value.page);
			pagination.meta.html(value.count.pluralize.apply(value.count, pitems));
			pagination.pages.html(value.pages.pluralize.apply(value.pages, ppages));
		}

		if (config.external) {
			options.items = value.items;
		} else {
			options.items = [];
			for (var i = 0, length = value.items.length; i < length; i++) {
				if (isFilter && !self.can(value.items[i]))
					continue;
				options.items.push(value.items[i]);
			}
			options.lastsort && options.items.quicksort(options.lastsort.name, options.lastsort.sorting === 'asc');
		}

		self.redraw();
	};
});

COMPONENT('inlineform', function(self, config) {

	var W = window;
	var header = null;
	var dw = 300;

	if (!W.$$inlineform) {
		W.$$inlineform = true;
		$(document).on('click', '.ui-inlineform-close', function() {
			SETTER('inlineform', 'hide');
		});
		$(window).on('resize', function() {
			SETTER('inlineform', 'hide');
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self);
		self.hide();
	};

	self.hide = function() {
		if (self.hclass('hidden'))
			return;
		self.release(true);
		self.aclass('hidden');
		self.find('.ui-inlineform').rclass('ui-inlineform-animate');
	};

	self.make = function() {

		var icon;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);
		else
			icon = '<i></i>';

		$(document.body).append('<div id="{0}" class="hidden ui-inlineform-container" style="max-width:{1}"><div class="ui-inlineform"><i class="fa fa-caret-up ui-inlineform-arrow"></i><div class="ui-inlineform-title"><button class="ui-inlineform-close"><i class="fa fa-times"></i></button>{4}<span>{3}</span></div></div></div>'.format(self._id, (config.width || dw) + 'px', self.path, config.title, icon));

		var el = $('#' + self._id);
		el.find('.ui-inlineform').get(0).appendChild(self.element.get(0));
		self.rclass('hidden');
		self.replace(el);

		header = self.virtualize({ title: '.ui-inlineform-title > span', icon: '.ui-inlineform-title > i' });

		self.find('button').on('click', function() {
			var el = $(this);
			switch (this.name) {
				case 'submit':
					if (el.hasClass('exec'))
						self.hide();
					else
						self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(self.hide);
		});
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'icon':
				header.icon.rclass(header.icon.attr('class'));
				value && header.icon.aclass('fa fa-' + value);
				break;
			case 'title':
				header.title.html(value);
				break;
		}
	};

	self.toggle = function(el, position, offsetX, offsetY) {
		if (self.hclass('hidden'))
			self.show(el, position, offsetX, offsetY);
		else
			self.hide();
	};

	self.show = function(el, position, offsetX, offsetY) {

		SETTER('inlineform', 'hide');

		self.rclass('hidden');
		self.release(false);

		var offset = el.offset();
		var w = config.width || dw;
		var ma = 35;

		if (position === 'right') {
			offset.left -= w - el.width();
			ma = w - 35;
		} else if (position === 'center') {
			ma = (w / 2);
			offset.left -= ma - (el.width() / 2);
			ma -= 12;
		}

		offset.top += el.height() + 10;

		if (offsetX)
			offset.left += offsetX;

		if (offsetY)
			offset.top += offsetY;

		config.reload && EXEC(config.reload, self);

		self.find('.ui-inlineform-arrow').css('margin-left', ma);
		self.css(offset);
		var el = self.find('input[type="text"],select,textarea');
		!isMOBILE && el.length && el.eq(0).focus();
		setTimeout(function() {
			self.find('.ui-inlineform').aclass('ui-inlineform-animate');
		}, 300);
	};
});

COMPONENT('contextmenu', function(self) {

	var is = false;
	var timeout, container, arrow;

	self.template = Tangular.compile('<div data-index="{{ index }}"{{ if selected }} class="selected"{{ fi }}><i class="fa {{ icon }}"></i><span>{{ name | raw }}</span></div>');
	self.singleton();
	self.readonly();
	self.callback = null;
	self.items = EMPTYARRAY;

	self.make = function() {

		self.classes('ui-contextmenu');
		self.append('<span class="ui-contextmenu-arrow fa fa-caret-up"></span><div class="ui-contextmenu-items"></div>');
		container = self.find('.ui-contextmenu-items');
		arrow = self.find('.ui-contextmenu-arrow');

		self.event('touchstart mousedown', 'div[data-index]', function(e) {
			self.callback && self.callback(self.items[+$(this).attr('data-index')], $(self.target));
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function() {
			is && self.hide(0);
		});
	};

	self.show = function(orientation, target, items, callback, offsetX, offsetY) {

		if (is) {
			clearTimeout(timeout);
			var obj = target instanceof jQuery ? target.get(0) : target;
			if (self.target === obj) {
				self.hide(0);
				return;
			}
		}

		target = $(target);
		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);
		else if (type === 'function') {
			callback = items;
			items = (target.attr('data-options') || '').split(';');
			for (var i = 0, length = items.length; i < length; i++) {
				item = items[i];
				if (!item)
					continue;
				var val = item.split('|');
				items[i] = { name: val[0], icon: val[1], value: val[2] || val[0] };
			}
		}

		if (!items) {
			self.hide(0);
			return;
		}

		self.callback = callback;

		var builder = [];
		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];
			item.index = i;
			if (item.icon) {
				if (item.icon.substring(0, 3) !== 'fa-')
					item.icon = 'fa-' + item.icon;
			} else
				item.icon = 'fa-caret-right';

			builder.push(self.template(item));
		}

		self.items = items;
		self.target = target.get(0);
		var offset = target.offset();

		container.html(builder);

		switch (orientation) {
			case 'left':
				arrow.css({ left: '15px' });
				break;
			case 'right':
				arrow.css({ left: '210px' });
				break;
			case 'center':
				arrow.css({ left: '107px' });
				break;
		}

		var options = { left: orientation === 'center' ? Math.ceil((offset.left - self.element.width() / 2) + (target.innerWidth() / 2)) : orientation === 'left' ? offset.left - 8 : (offset.left - self.element.width()) + target.innerWidth() + (offsetX || 0), top: offset.top + target.innerHeight() + 10 + (offsetY || 0) };
		self.css(options);

		if (is)
			return;

		self.element.show();
		setTimeout(function() {
			self.classes('ui-contextmenu-visible');
			self.emit('contextmenu', true, self, self.target);
		}, 100);

		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.element.hide().rclass('ui-contextmenu-visible');
			self.emit('contextmenu', false, self, self.target);
			self.callback = null;
			self.target = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});

COMPONENT('importer', function(self, config) {

	var imported = false;

	self.readonly();
	self.setter = function() {

		if (!self.evaluate(config.if))
			return;

		if (imported) {
			if (config.reload)
				EXEC(config.reload);
			else
				self.setter = null;
			return;
		}

		imported = true;
		IMPORT(config.url, function() {
			if (config.reload)
				EXEC(config.reload);
			else
				self.remove();
		});
	};
});

COMPONENT('photoupload', function(self, config) {

	var input;
	var last;

	self.readonly();

	self.make = function() {
		var id = 'photoupload' + self.id;

		self.aclass('ui-photoupload');
		self.html('<img src="/img/face.jpg" alt="" class="img-responsive" />');

		$(document.body).append('<input type="file" id="{0}" class="hidden" accept="image/*" />'.format(id));

		input = $('#' + id);

		self.event('click', function() {
			input.click();
		});

		input.on('change', function(evt) {

			var email = self.get();
			var files = evt.target.files;
			var data = new FormData();
			var el = this;

			data.append('email', email);

			for (var i = 0, length = files.length; i < length; i++)
				data.append('file' + i, files[i]);

			var loading = FIND('loading');
			loading && loading.show();

			UPLOAD(config.url, data, function(response, err) {

				loading && loading.hide(500);

				if (err) {
					var message = FIND('message');
					message && message.warning(err.toString());
					return;
				}

				self.find('img').attr('src', Tangular.helpers.photo(response.value));
				el.value = '';
				self.set(response.value);
				self.change();
			});
		});
	};

	self.setter = function(value) {
		if (last !== value) {
			last = value;
			self.find('img').attr('src', Tangular.helpers.photo(value));
		}
	};
});

COMPONENT('template', function(self) {

	var properties = null;

	self.readonly();

	self.configure = function(key, value) {
		if (key === 'properties')
			properties = value.split(',').trim();
	};

	self.make = function(template) {

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.parent();
		}

		self.template = Tangular.compile(script.html());
		script.remove();
	};

	self.setter = function(value, path) {

		if (properties && path !== self.path) {
			var key = path.substring(self.path.length + 1);
			if (!key || properties.indexOf(key))
				return;
		}

		if (NOTMODIFIED(self.id, value))
			return;
		if (value) {
			KEYPRESS(function() {
				self.html(self.template(value)).rclass('hidden');
			}, 100, self.id);
		} else
			self.aclass('hidden');
	};
});

COMPONENT('dropdowncheckbox', 'checkicon:check', function(self, config) {

	var data = [], render = '';
	var container, values, content, datasource = null;
	var prepared = false;
	var W = window;

	!W.$dropdowncheckboxtemplate && (W.$dropdowncheckboxtemplate = Tangular.compile('<div class="ui-dropdowncheckbox-item" data-index="{{ index }}"><div><i class="fa fa-{{ $.checkicon }}"></i></div><span>{{ text }}</span></div>'));
	var template = W.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {

			case 'type':
				self.type = value;
				break;

			case 'required':
				self.find('.ui-dropdowncheckbox-label').tclass('ui-dropdowncheckbox-required', config.required);
				break;

			case 'label':
				content = value;
				redraw = true;
				break;

			case 'disabled':
				self.tclass('ui-disabled', value);
				break;

			case 'checkicon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;

			case 'icon':
				redraw = true;
				break;

			case 'datasource':
				var was = datasource;
				was && self.unwatch(datasource, self.bind);
				self.watch(value, self.bind, true);
				was && self.refresh();
				datasource = value;
				break;

			case 'items':

				if (value instanceof Array) {
					self.bind('', value);
					return;
				}

				var items = [];
				value.split(',').forEach(function(item) {
					item = item.trim().split('|');
					var val = (item[1] == null ? item[0] : item[1]).trim();
					if (config.type === 'number')
						val = +val;
					items.push({ name: item[0].trim(), id: val });
				});

				self.bind('', items);
				self.refresh();
				break;
		}

		redraw && setTimeout2(self.id + '.redraw', self.redraw, 100);
	};

	self.redraw = function() {

		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">{0}</div>'.format(render);
		if (content.length)
			self.html('<div class="ui-dropdowncheckbox-label{0}">{1}{2}:</div>'.format(config.required ? ' ui-dropdowncheckbox-required' : '', config.icon ? ('<i class="fa fa-' + config.icon + '"></i>') : '', content) + html);
		else
			self.html(html);

		container = self.find('.ui-dropdowncheckbox-values');
		values = self.find('.ui-dropdowncheckbox-selected');
		prepared && self.refresh();
		self.tclass('ui-disabled', config.disabled === true);
	};

	self.make = function() {

		self.type = config.type;

		content = self.html();
		self.aclass('ui-dropdowncheckbox-container');
		self.redraw();

		if (config.items)
			self.reconfigure({ items: config.items });
		else if (config.datasource)
			self.reconfigure({ datasource: config.datasource });
		else
			self.bind('', null);

		self.event('click', '.ui-dropdowncheckbox', function(e) {

			if (config.disabled)
				return;

			container.tclass('hidden');

			if (W.$dropdowncheckboxelement) {
				W.$dropdowncheckboxelement.aclass('hidden');
				W.$dropdowncheckboxelement = null;
			}

			!container.hasClass('hidden') && (W.$dropdowncheckboxelement = container);
			e.stopPropagation();
		});

		self.event('click', '.ui-dropdowncheckbox-item', function(e) {

			e.stopPropagation();

			if (config.disabled)
				return;

			var el = $(this);
			var is = !el.hasClass('ui-dropdowncheckbox-checked');
			var index = +el.attr('data-index');
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();

			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, undefined, 2);
		});
	};

	self.bind = function(path, value) {
		var clsempty = 'ui-dropdowncheckbox-values-empty';
		prepared = true;

		if (!value) {
			container.aclass(clsempty).html(config.empty);
			return;
		}

		var kv = config.value || 'id';
		var kt = config.text || 'name';

		render = '';
		data = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			render += template(item, config);
			data.push(item);
		}

		if (render)
			container.rclass(clsempty).html(render);
		else
			container.aclass(clsempty).html(config.empty);
	};

	self.setter = function(value) {

		if (!prepared)
			return;

		var label = '';

		if (value && value.length) {
			var remove = [];
			for (var i = 0, length = value.length; i < length; i++) {
				var selected = value[i];
				var index = 0;
				var is = false;
				while (true) {
					var item = data[index++];
					if (item === undefined)
						break;
					if (item.value != selected)
						continue;
					label += (label ? ', ' : '') + item.text;
					is = true;
				}
				!is && remove.push(selected);
			}

			if (config.cleaner !== false) {
				var refresh = false;
				while (true) {
					var item = remove.shift();
					if (item === undefined)
						break;
					value.splice(value.indexOf(item), 1);
					refresh = true;
				}
				refresh && self.set(value);
			}
		}

		container.find('.ui-dropdowncheckbox-item').each(function() {
			var el = $(this);
			var index = +el.attr('data-index');
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			checked && (checked = value.indexOf(checked.value) !== -1);
			el.tclass('ui-dropdowncheckbox-checked', checked);
		});

		if (!label && value) {
			// invalid data
			// it updates model without notification
			self.rewrite([]);
		}

		if (!label && config.placeholder) {
			values.removeAttr('title', '');
			values.html('<span>{0}</span>'.format(config.placeholder));
		} else {
			values.attr('title', label);
			values.html(label);
		}
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-dropdowncheckbox').tclass('ui-dropdowncheckbox-invalid', invalid);
	};

	if (W.$dropdowncheckboxevent)
		return;

	W.$dropdowncheckboxevent = true;
	$(document).on('click', function() {
		if (W.$dropdowncheckboxelement) {
			W.$dropdowncheckboxelement.aclass('hidden');
			W.$dropdowncheckboxelement = null;
		}
	});
});

COMPONENT('notify', 'timeout:3000', function(self, config) {

	var autoclosing;

	self.singleton();
	self.readonly();
	self.template = Tangular.compile('<div class="ui-notify ui-notify-{{ type }}" data-id="{{ id }}"><div class="ui-notify-icon"><i class="fa {{ icon }}"></i></div><div class="ui-notify-message">{{ message }}</div>');
	self.items = {};

	self.make = function() {
		self.aclass('ui-notify-container');
		self.event('click', '.ui-notify', function() {
			var el = $(this);
			self.close(+el.attrd('id'));
			clearTimeout(autoclosing);
			autoclosing = null;
			self.autoclose();
		});
	};

	self.close = function(id) {
		var obj = self.items[id];
		if (!obj)
			return;

		delete self.items[id];
		var item = self.find('div[data-id="{0}"]'.format(id));
		item.aclass('ui-notify-hide');
		setTimeout(function() {
			item.remove();
		}, 600);
	};

	self.append = function(message, type) {

		if (!type)
			type = 1;

		// type 1: success
		// type 2: warning

		var obj = { id: Math.floor(Math.random() * 100000), message: message, type: type, icon: type === 1 ? 'fa-check-circle' : type === 2 ? 'fa-times-circle' : 'fa-info-circle' };
		self.items[obj.id] = obj;
		self.element.append(self.template(obj));
		self.autoclose();
	};

	self.autoclose = function() {

		if (autoclosing)
			return;

		autoclosing = setTimeout(function() {
			clearTimeout(autoclosing);
			autoclosing = null;
			var el = self.find('.ui-notify');
			el.length > 1 && self.autoclose();
			el.length && self.close(+el.eq(0).attrd('id'));
		}, config.timeout);
	};
});

COMPONENT('repeater', 'hidden:true;check:true', function(self, config) {

	var filter = null;
	var recompile = false;
	var reg = /\$(index|path)/g;

	self.readonly();

	self.configure = function(key, value) {
		if (key === 'filter')
			filter = value ? GET(value) : null;
	};

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			config.hidden && self.aclass('hidden');
			self.empty();
			self.cache = '';
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			if (!filter || filter(item)) {
				builder.push(self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
				}));
			}
		}

		var tmp = builder.join('');

		if (config.check) {
			if (tmp === self.cache)
				return;
			self.cache = tmp;
		}

		self.html(tmp);
		config.hidden && self.rclass('hidden');
		recompile && self.compile();
	};
});

COMPONENT('processes', function(self, config) {

	var self = this;
	var iframes = [];
	var current_title = document.title;

	self.template = Tangular.compile('<div class="ui-process ui-process-animation" data-id="{{ id }}"><iframe src="/loading.html" frameborder="0" scrolling="yes" allowtransparency="true" class="ui-process-iframe"></iframe><div>');
	self.readonly();

	self.message = function(item, type, message, callbackid, error) {

		var data = {};

		data.openplatform = true;
		data.type = type;
		data.body = message;

		if (error)
			data.error = error.toString();

		if (callbackid)
			data.callback = callbackid;

		item.element.find('iframe').get(0).contentWindow.postMessage(JSON.stringify(data), '*');
		return true;
	};

	self.findProcess = function(id) {
		return iframes.findItem('id', id);
	};

	self.minimize = function() {

		iframes.forEach(function(item) {
			if (!item.element.hclass('hidden')) {
				item.element.aclass('hidden');
				self.message(item, 'minimize');
			}
		});

		$('html').rclass('noscroll');
		document.title = current_title;
		return self;
	};

	self.maximize = function(iframe) {
		document.title = current_title + ': ' + iframe.meta.internal.title;
		location.hash = iframe.meta.internal.linker;
		iframe.element.rclass('hidden');
		self.message(iframe, 'maximize');
	};

	self.kill = function(id) {

		if (id === undefined) {
			GET(config.datasource).forEach(function(item) {
				self.kill(item.id);
			});
			return;
		}

		SETTER('loading', 'show');

		var index = iframes.findIndex('id', id);
		if (index === -1)
			return self;

		var iframe = iframes[index];
		iframes.splice(index, 1);

		iframe.element.aclass('hidden');
		self.minimize();
		location.hash = '';

		// Timeout for iframe cleaning scripts
		setTimeout(function() {
			iframe.iframe.attr('src', 'about:blank');
			iframe.iframe.remove();
			iframe.element.off();
			iframe.element.remove();
			SETTER('loading', 'hide', 200);
		}, 1000);

		var apps = GET(config.datasource);
		var item = apps.findItem('id', id);

		if (item) {
			item.internal.running = false;
			item.running = false;
			self.message(iframe, 'kill');
		}

		SET(config.datasource, apps.remove('id', id));
		return self;
	};

	function makeurl(url, accesstoken) {
		var index = url.indexOf('?');
		if (index === -1)
			return url + '?openplatform=' + accesstoken;
		else
			return url.substring(0, index + 1) + 'openplatform=' + accesstoken + '&' + url.substring(index + 1);
	}

	self.setter = function(value) {

		self.minimize();

		if (!value) {
			document.title = current_title;
			location.hash = '';
			return;
		}

		var item = GET(config.datasource).findItem('id', value.id);
		if (!item) {
			WARN('Application {0} not found.'.format(value.id));
			return;
		}

		var iframe = iframes.findItem('id', value.id);
		if (iframe) {
			self.maximize(iframe);
			if (iframe.meta.href) {
				self.message(iframe, 'redirect', iframe.meta.href);
				iframe.meta.href = undefined;
			}
			return;
		}

		SETTER('loading', 'show');

		iframe = {};
		self.append(self.template(value, iframe));
		document.title = current_title + ': ' + value.internal.title;

		value.internal.running = true;
		item.running = true;
		iframe.id = value.id;
		iframe.meta = value;
		iframe.element = self.find('[data-id="{0}"]'.format(value.id));
		iframe.iframe = iframe.element.find('iframe');
		iframe.iframe.height($(window).height() - 50);
		iframe.dateopen = new Date();
		iframes.push(iframe);

		location.hash = value.internal.linker;

		setTimeout(function() {
			iframe.iframe.attr('src', makeurl(value.url, value.accesstoken));
		}, 1500);

		setTimeout(function() {
			iframe.element.rclass('ui-process-animation');
		}, 500);

		SETTER('loading', 'hide', 1000);
		UPDATE(config.datasource);
		$('.appclose[data-id="{0}"]'.format(value.id)).rclass('hidden');
	};
});

COMPONENT('notificationspanel', function() {

	var self = this;
	var container, button;
	var count = 0;

	self.readonly();
	self.singleton();

	self.make = function() {
		var scr = self.find('script');
		self.aclass('ui-npanel');
		self.template = Tangular.compile(scr.html());
		scr.remove();
		self.element.append('<div class="ui-npanel-container"></div>');
		container = self.find('.ui-npanel-container');
		button = self.find('.ui-npanel-clear');

		self.event('click', '.ui-npanel-message', function() {
			count--;
			var el = $(this);
			el.aclass('ui-npanel-remove');
			setTimeout(function() {
				el.remove();
			}, 300);
			if (!count) {
				button.aclass('hidden');
				self.set(false);
			}
		});

		self.event('click', '.ui-npanel-clear', function() {
			count = 0;
			button.aclass('hidden');
			container.empty();
			self.set(false);
		});
	};

	self.append = function(value) {
		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			if (item.idapp) {
				var app = user.apps.findItem('id', item.idapp);
				if (app) {
					item.icon = app.icon;
					item.title = app.title;
					builder.push(self.template(item));
					count++;
				}
			} else if (item.title) {
				builder.push(self.template(item));
				count++;
			}
		}

		container.prepend(builder.join(''));
		button.tclass('hidden', count === 0);
	};
});

COMPONENT('textboxlist', 'maxlength:100', function(self, config) {

	var container, content;
	var empty = {};
	var skip = false;

	self.readonly();
	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}"{{ if disabled}} disabled="disabled"{{ fi }} value="{{ value }}" /></div></div>');

	self.configure = function(key, value, init, prev) {
		if (init)
			return;

		var redraw = false;
		switch (key) {
			case 'disabled':
				self.tclass('ui-required', value);
				self.find('input').prop('disabled', true);
				empty.disabled = value;
				break;
			case 'maxlength':
				empty.max = value;
				self.find('input').prop(key, value);
				break;
			case 'placeholder':
				empty.placeholder = value;
				self.find('input').prop(key, value);
				break;
			case 'label':
				redraw = true;
				break;
			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass(value);
				else
					redraw = true;
				break;
		}

		if (redraw) {
			skip = false;
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var icon = '';
		var html = config.label || content;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);

		empty.value = '';
		self.html((html ? '<div class="ui-textboxlist-label">{1}{0}:</div>'.format(html, icon) : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');
	};

	self.make = function() {

		empty.max = config.max;
		empty.placeholder = config.placeholder;
		empty.value = '';
		empty.disabled = config.disabled;

		if (config.disabled)
			self.aclass('ui-disabled');

		content = self.html();
		self.aclass('ui-textboxlist');
		self.redraw();

		self.event('click', '.fa-times', function() {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;
			arr.splice(index, 1);
			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});

		self.event('change keypress', 'input', function(e) {

			if (config.disabled || (e.type !== 'change' && e.which !== 13))
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base').length > 0;

			if (base && e.type === 'change')
				return;

			if (base) {
				self.get().indexOf(value) === -1 && self.push(self.path, value, 2);
				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function() {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(self.path, arr, 2);
			self.change(true);
		});
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			container.empty();
			return;
		}

		var builder = [];

		value.forEach(function(item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};
});

COMPONENT('range', function(self, config) {

	var content = '';

	self.validate = function(value) {
		return !config.required || config.disabled ? true : value != 0;
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		var redraw = false;
		switch (key) {
			case 'step':
			case 'max':
			case 'min':
				var input = self.find('input');
				if (value)
					input.prop(key, value);
				else
					input.removeProp(key);
				break;

			case 'icon':
				if (value && prev)
					self.find('i').rclass().aclass('fa fa-' + value);
				else
					redraw = true;
				break;

			case 'required':
				self.find('.ui-range-label').tclass('ui-range-label-required', value);
				break;

			case 'type':
				self.type = value;
				break;

			case 'label':
				redraw = true;
				break;
		}

		if (redraw) {
			self.redraw();
			self.refresh();
		}
	};

	self.redraw = function() {

		var label = config.label || content;
		var html = '';

		if (label)
			html = '<div class="ui-range-label{1}">{2}{0}:</div>'.format(label, config.required ? ' ui-range-label-required' : '', (config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : ''));

		var attrs = [];
		config.step && attrs.attr('step', config.step);
		config.max && attrs.attr('max', config.max);
		config.min && attrs.attr('min', config.min);
		self.html('{0}<input type="range" data-jc-bind=""{1} />'.format(html, attrs.length ? ' ' + attrs.join(' ') : ''));
	};

	self.make = function() {
		self.type = config.type;
		content = self.html();
		self.aclass('ui-range');
		self.redraw();
	};
});

COMPONENT('calendar', 'today:Set today;firstday:0', function(self, config) {

	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = EMPTYARRAY;
	self.months = EMPTYARRAY;
	self.months_short = EMPTYARRAY;

	self.configure = function(key, value) {
		switch (key) {
			case 'days':
				if (value instanceof Array)
					self.days = value;
				else
					self.days = value.split(',').trim();
				break;

			case 'months':
				if (value instanceof Array)
					self.months = value;
				else
					self.months = value.split(',').trim();

				self.months_short = [];

				for (var i = 0, length = self.months.length; i < length; i++) {
					var m = self.months[i];
					if (m.length > 4)
						m = m.substring(0, 3) + '.';
					self.months_short.push(m);
				}
				break;
		}
	};

	self.readonly();
	self.click = function() {};

	function getMonthDays(dt) {

		var m = dt.getMonth();
		var y = dt.getFullYear();

		if (m === -1) {
			m = 11;
			y--;
		}

		return (32 - new Date(y, m, 32).getDate());
	}

	function calculate(year, month, selected) {

		var d = new Date(year, month, 1);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = config.firstday;
		var firstCount = 0;
		var fromd = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (fromd < 0)
			fromd = 7 + fromd;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1)) - fromd;

		for (var i = 0; i < days + fromd; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= fromd) {
				obj.number = ++index;
				obj.isSelected = sy === year && sm === month && sd === index;
				obj.isToday = ty === year && tm === month && td === index;
				obj.isFuture = ty < year;

				if (!obj.isFuture && year === ty) {
					if (tm < month)
						obj.isFuture = true;
					else if (tm === month)
						obj.isFuture = td < index;
				}

			} else {
				indexEmpty++;
				obj.number = prev + indexEmpty;
				obj.isEmpty = true;
			}

			output.days.push(obj);
		}

		indexEmpty = 0;
		for (var i = count; i < 42; i++)
			output.days.push({ isToday: false, isSelected: false, isEmpty: true, isFuture: false, number: ++indexEmpty, index: ++count });
		return output;
	}

	self.hide = function() {
		self.aclass('hidden');
		visible = false;
		return self;
	};

	self.toggle = function(el, value, callback, offset) {

		if (self.older === el.get(0)) {
			if (!self.hclass('hidden')) {
				self.hide();
				return;
			}
		}

		self.older = el.get(0);
		self.show(el, value, callback, offset);
		return self;
	};

	self.show = function(el, value, callback, offset) {

		setTimeout(function() {
			clearTimeout2('calendarhide');
		}, 5);

		if (!el)
			return self.hide();

		var off = el.offset();
		var h = el.innerHeight();

		self.css({ left: off.left + (offset || 0), top: off.top + h + 12 });
		self.rclass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		return self;
	};

	self.make = function() {

		self.aclass('ui-calendar hidden');

		var conf = {};

		if (!config.days) {
			conf.days = [];
			for (var i = 0; i < DAYS.length; i++)
				conf.days.push(DAYS[i].substring(0, 2).toUpperCase());
		}

		!config.months && (conf.months = MONTHS);
		self.reconfigure(conf);

		self.event('click', '.ui-calendar-today', function() {
			var dt = new Date();
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]));
			self.find('.ui-calendar-selected').removeClass('ui-calendar-selected');
			$(this).addClass('ui-calendar-selected');
			skip = true;
			self.hide();
			self.click && self.click(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}
			skipDay = true;
			self.date(dt);
		});

		$(document.body).on('scroll click', function() {
			visible && setTimeout2('calendarhide', function() {
				EXEC('$calendar.hide');
			}, 20);
		});

		window.$calendar = self;

		self.on('reflow', function() {
			visible && EXEC('$calendar.hide');
		});
	};

	self.date = function(value) {

		if (typeof(value) === 'string')
			value = value.parseDate();

		if (!value || isNaN(value.getTime()))
			value = DATETIME;

		var empty = !value;

		if (skipDay) {
			skipDay = false;
			empty = true;
		}

		if (skip) {
			skip = false;
			return;
		}

		if (!value)
			value = new Date();

		var output = calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			if (item.isEmpty)
				cls.push('ui-calendar-disabled');
			else
				cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push('ui-calendar-selected');
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}">{3}</td>'.format(cls.join(' '), output.year, output.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-chevron-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-chevron-right"></span></button></div><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table>'.format(output.year, output.month, self.months[value.getMonth()], value.getFullYear(), header.join(''), builder.join('')) + (config.today ? '<div><a href="javascript:void(0)" class="ui-calendar-today">' + config.today + '</a></div>' : ''));
	};
});

COMPONENT('audio', function(self) {

	var can = false;
	var volume = 0.5;

	self.items = [];
	self.readonly();
	self.singleton();

	self.make = function() {
		var audio = document.createElement('audio');
		if (audio.canPlayType && audio.canPlayType('audio/mpeg').replace(/no/, ''))
			can = true;
	};

	self.play = function(url) {

		if (!can)
			return;

		var audio = new window.Audio();

		audio.src = url;
		audio.volume = volume;
		audio.play();

		audio.onended = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		audio.onerror = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		audio.onabort = function() {
			audio.$destroy = true;
			self.cleaner();
		};

		self.items.push(audio);
		return self;
	};

	self.cleaner = function() {
		var index = 0;
		while (true) {
			var item = self.items[index++];
			if (item === undefined)
				return self;
			if (!item.$destroy)
				continue;
			item.pause();
			item.onended = null;
			item.onerror = null;
			item.onsuspend = null;
			item.onabort = null;
			item = null;
			index--;
			self.items.splice(index, 1);
		}
	};

	self.stop = function(url) {

		if (!url) {
			self.items.forEach(function(item) {
				item.$destroy = true;
			});
			return self.cleaner();
		}

		var index = self.items.findIndex('src', url);
		if (index === -1)
			return self;
		self.items[index].$destroy = true;
		return self.cleaner();
	};

	self.setter = function(value) {

		if (value === undefined)
			value = 0.5;
		else
			value = (value / 100);

		if (value > 1)
			value = 1;
		else if (value < 0)
			value = 0;

		volume = value ? +value : 0;
		for (var i = 0, length = self.items.length; i < length; i++) {
			var a = self.items[i];
			if (!a.$destroy)
				a.volume = value;
		}
	};
});

COMPONENT('modificator', function(self) {

	var keys, keys_unique;
	var db = {};

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		$(document).on('click', '.modify', function() {
			var el = $(this);
			self.click(el.attrd('m'), el.attrd('m-schema'));
		});
	};

	self.autobind = function(path, value, type) {

		var mapper = keys[path];
		if (!mapper)
			return;

		for (var i = 0, length = mapper.length; i < length; i++) {
			var item = mapper[i];
			var schema = db[item.schema];
			item.event.type = 'bind';
			item.event.bindtype = type;
			schema && schema(GET(item.path), item.selector ? item.element.find(item.selector) : item.element, item.event);
		}
	};

	self.click = function(path, schema) {

		if (path.substring(0, 1) === '%')
			path = 'jctmp.' + path.substring(1);

		var fn = db[schema];
		if (fn) {
			var arr = keys[path];
			if (arr) {
				var val = GET(path);
				for (var i = 0, length = arr.length; i < length; i++) {
					var obj = arr[i];
					if (obj.schema === schema) {
						obj.event.type = 'click';
						obj.event.bindtype = -1;
						fn(val, obj.selector ? obj.element.find(obj.selector) : obj.element, obj.event);
					}
				}
			}
		}
		return self;
	};

	self.reinit = function(path) {
		var arr = keys[path];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.event.type = 'init';
			obj.event.bindtype = -1;
			var schema = db[obj.schema];
			schema && schema(GET(obj.path), obj.selector ? obj.element.find(obj.selector) : obj.element, obj.event);
		}
		return self;
	};

	self.register = function(name, fn) {
		db[name] = fn;
		var paths = Object.keys(keys);
		for (var i = 0, length = paths.length; i < length; i++) {
			var arr = keys[paths[i]];
			for (var j = 0, jl = arr.length; j < jl; j++) {
				var obj = arr[j];
				if (obj.init || obj.schema !== name)
					continue;
				obj.init = true;
				obj.event.type = 'init';
				obj.event.bindtype = -1;
				fn(GET(obj.path), obj.selector ? obj.element.find(obj.selector) : obj.element, obj.event);
			}
		}
		return self;
	};

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-m]').each(function() {

			var el = $(this);
			var path = (el.attrd('m') || '').replace('%', 'jctmp.');
			var arr = path.split('.');
			var p = '';

			var obj = el.data('data-m');
			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.schema = el.attrd('m-schema');
				obj.selector = el.attrd('m-selector');
				obj.element = el;
				obj.event = { type: 'init' };
				obj.init = false;
				el.data('data-m', obj);
				if (db[obj.schema]) {
					obj.init = true;
					db[obj.schema](GET(obj.path), obj.selector ? obj.element.find(obj.selector) : obj.element, obj.event);
				}
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}
		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, GET(key));
		});

		return self;
	};
});

COMPONENT('app-managment', function(self, config) {

	self.make = function() {
		var el = self.find('script');
		self.template = Tangular.compile(el.html());
		el.remove();

		self.event('click', '.userapp-checkbox', function() {
			var el = $(this).closest('.userapp-container');
			var cls = 'userapp-container-disabled';
			var id = el.attrd('id');

			el.tclass(cls);

			var apps = self.get();

			if (!apps) {
				apps = {};
				self.rewrite(apps);
			}

			if (el.hclass(cls))
				delete apps[id];
			else
				apps[id] = { roles: [], settings: '' };

			self.change(true);
		});

		self.event('change', 'input', function() {

			self.change(true);

			if (this.type === 'text')
				return;

			var el = $(this).closest('.userapp-container');
			var id = el.attrd('id');
			var apps = self.get();
			var app = apps[id].roles;
			var index = app.indexOf(this.value);
			if (this.checked) {
				index === -1 && app.push(this.value);
			} else {
				index !== -1 && app.splice(index, 1);
			}
		});

		self.watch(config.datasource, function(path, value) {
			if (!value)
				return;
			var builder = [];
			for (var i = 0, length = value.length; i < length; i++)
				builder.push(self.template(value[i]));
			self.html(builder.join(''));
			self.update();
		}, true);
	};

	self.setter = function(value) {

		var cls = 'userapp-container-disabled';

		self.find('.userapp-container').each(function() {
			var el = $(this);
			var id = el.attrd('id');
			if (value && value[id]) {
				el.rclass(cls);
				el.find('input').each(function() {
					this.checked = value[id].roles.indexOf(this.value) !== -1;
				});
			} else {
				el.aclass(cls);
				el.find('input').prop('checked', false);
			}

			// HACK
			el.find('.userapp-settings-input').val(users.form && users.form.apps && users.form.apps[id] ? users.form.apps[id].settings || '' : '');
		});
	};
});