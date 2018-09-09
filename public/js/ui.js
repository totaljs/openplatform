COMPONENT('xs', function(self, config) {
	var is = false;
	self.readonly();
	self.make = function() {
		is = WIDTH() === 'xs';
		is && self.aclass('ui-xs hidden');
	};
	self.setter = function(value) {
		if (is) {
			var show = EVALUATE(value, config.if, true);
			self.tclass('hidden', !show);
			show && config.exec && setTimeout(function() {
				EXEC(config.exec);
			}, 100);
		}
	};
});

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
				self.find('i').rclass2('fa-').aclass('fa-' + value);
				break;
		}
	};

	self.make = function() {
		self.aclass('ui-checkbox');
		self.html('<div><i class="fa fa-{2}"></i></div><span{1}>{0}</span>'.format(config.label || self.html(), config.required ? ' class="ui-checkbox-label-required"' : '', config.checkicon || 'check'));
		config.disabled && self.aclass('ui-disabled');
		self.event('click', function() {
			if (config.disabled)
				return;
			self.dirty(false);
			self.getter(!self.get());
		});
	};

	self.setter = function(value) {
		self.tclass('ui-checkbox-checked', !!value);
	};
});

COMPONENT('time', function(self) {

	self.readonly();
	self.blind();

	self.make = function() {

		self.append('<div class="ui-datetime-time"></div><div class="ui-datetime-date b"></div>');

		var time = self.find('.ui-datetime-time');
		var date = self.find('.ui-datetime-date');

		self.bindtime = function() {
			var dt = new Date();
			time.html(dt.format('HH:mm'));
			date.html(dt.format('dd. MMMM yyyy'));
		};

		setInterval(self.bindtime, 30000);
		self.bindtime();
	};
});

COMPONENT('dropdown', function(self, config) {

	var select, container, condition, content = null;
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
			case 'if':
				condition = value ? FN(value) : null;
				break;
			case 'required':
				self.find('.ui-dropdown-label').tclass('ui-dropdown-label-required', value);
				self.state(1, 1);
				break;
			case 'datasource':
				self.datasource(value, self.bind);
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
		var html = '<div class="ui-dropdown"><select data-jc-bind="">{0}</select></div>'.format(render);
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
		self.type = config.type;
		content = self.html();
		self.aclass('ui-dropdown-container');
		self.redraw();
		config.if && (condition = FN(config.if));
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

		if (config.minlength && value.length < config.minlength)
			return false;

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return config.validation ? !!self.evaluate(value, config.validation, true) : value.length > 0;
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
				SETTER('calendar', 'toggle', self.element, self.get(), function(date) {
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
			} else if (config.icon2click)
				EXEC(config.icon2click, self);
		});

		self.event('focus', 'input', function() {
			config.autocomplete && EXEC(config.autocomplete, self);
		});

		self.redraw();
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];
		var tmp = 'text';

		switch (config.type) {
			case 'password':
				tmp = config.type;
				break;
			case 'number':
				isMOBILE && (tmp = 'tel');
				break;
		}

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
		!isMOBILE && config.autofocus && attrs.attr('autofocus');

		builder.push('<div class="ui-textbox-input"><input {0} /></div>'.format(attrs.join(' ')));

		var icon = config.icon;
		var icon2 = config.icon2;

		if (!icon2 && self.type === 'date')
			icon2 = 'calendar';
		else if (self.type === 'search') {
			icon2 = 'search';
			self.setter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = !value;
				self.find('.ui-textbox-control-icon').tclass('fa-times', !!value).tclass('fa-search', !value);
			};
		}

		icon2 && builder.push('<div class="ui-textbox-control"><span class="fa fa-{0} ui-textbox-control-icon"></span></div>'.format(icon2));
		config.increment && !icon2 && builder.push('<div class="ui-textbox-control"><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

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
		return config.type === 'date' ? (value ? value.format(config.format || 'yyyy-MM-dd') : value) : value;
	});

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textbox-invalid', invalid);
		config.error && self.find('.ui-textbox-helper').tclass('ui-textbox-helper-show', invalid);
	};
});

COMPONENT('exec', function(self, config) {
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', config.selector || '.exec', function(e) {
			var el = $(this);

			var attr = el.attrd('exec');
			var path = el.attrd('path');
			var href = el.attrd('href');

			if (el.attrd('prevent') === 'true') {
				e.preventDefault();
				e.stopPropagation();
			}

			attr && EXEC(attr, el, e);
			href && NAV.redirect(href);

			if (path) {
				var val = el.attrd('value');
				if (val) {
					var v = GET(path);
					SET(path, new Function('value', 'return ' + val)(v), true);
				}
			}
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
				self.release(!is);
				EMIT('resize');
			}, 200);

		}, false);
	};
});

COMPONENT('validation', 'delay:100;flags:visible', function(self, config) {

	var path, elements = null;
	var def = 'button[name="submit"]';
	var flags = null;

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector || def);
		path = self.path.replace(/\.\*$/, '');
		setTimeout(function() {
			self.watch(self.path, self.state, true);
		}, 50);
	};

	self.configure = function(key, value, init) {
		switch (key) {
			case 'selector':
				if (!init)
					elements = self.find(value || def);
				break;
			case 'flags':
				if (value) {
					flags = value.split(',');
					for (var i = 0; i < flags.length; i++)
						flags[i] = '@' + flags[i];
				} else
					flags = null;
				break;
		}
	};

	self.state = function() {
		setTimeout2(self.id, function() {
			var disabled = DISABLED(path, flags);
			if (!disabled && config.if)
				disabled = !EVALUATE(self.path, config.if);
			elements.prop('disabled', disabled);
		}, config.delay);
	};
});

COMPONENT('websocket', 'reconnect:3000', function(self, config) {

	var ws, url;
	var queue = [];
	var sending = false;

	self.online = false;
	self.readonly();

	self.make = function() {
		url = (config.url || '').env(true);
		if (!url.match(/^(ws|wss):\/\//))
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
		async.wait(function(item, next) {
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

	function onClose(e) {

		if (e.code === 4001) {
			location.reload(true);
			return;
		}

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
			ws = new WebSocket(url.env(true));
			ws.onopen = onOpen;
			ws.onclose = onClose;
			ws.onmessage = onMessage;
		}, 100);
		return self;
	};
});

COMPONENT('form', function(self, config) {

	var W = window;
	var csspos = {};

	if (!W.$$form) {

		W.$$form_level = W.$$form_level || 1;
		W.$$form = true;

		$(document).on('click', '.ui-form-button-close', function() {
			SET($(this).attrd('path'), '');
		});

		$(W).on('resize', function() {
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

	self.icon = function(value) {
		var el = this.rclass2('fa');
		value.icon && el.aclass('fa fa-' + value.icon);
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

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}px"><div data-bind="@config__html span:value.title__change .ui-form-icon:@icon" class="ui-form-title"><button class="ui-form-button-close{3}" data-path="{2}"><i class="fa fa-times"></i></button><i class="ui-form-icon"></i><span></span></div></div></div>'.format(self.ID, config.width || 800, self.path, config.closebutton == false ? ' hidden' : ''));
		var el = $('#' + self.ID);
		el.find('.ui-form')[0].appendChild(self.dom);
		self.rclass('hidden');
		self.replace(el);

		self.event('scroll', function() {
			EMIT('scroll', self.name);
			EMIT('reflow', self.name);
		});

		self.find('button').on('click', function() {
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
			e.which === 13 && !self.find('button[name="submit"]')[0].disabled && setTimeout(function() {
				self.submit(self);
			}, 800);
		});
	};

	self.configure = function(key, value, init, prev) {
		if (init)
			return;
		switch (key) {
			case 'width':
				value !== prev && self.find('.ui-form').css('max-width', value + 'px');
				break;
			case 'closebutton':
				self.find('.ui-form-button-close').tclass(value !== true);
				break;
		}
	};

	self.setter = function(value) {

		setTimeout2('ui-form-noscroll', function() {
			$('html').tclass('ui-form-noscroll', !!$('.ui-form-container').not('.hidden').length);
		}, 50);

		var isHidden = value !== config.if;

		if (self.hclass('hidden') === isHidden)
			return;

		setTimeout2('formreflow', function() {
			EMIT('reflow', self.name);
		}, 10);

		if (isHidden) {
			self.aclass('hidden');
			self.release(true);
			self.find('.ui-form').rclass('ui-form-animate');
			W.$$form_level--;
			return;
		}

		if (W.$$form_level < 1)
			W.$$form_level = 1;

		W.$$form_level++;

		self.css('z-index', W.$$form_level * 10);
		self.element.scrollTop(0);
		self.rclass('hidden');

		self.resize();
		self.release(false);

		config.reload && EXEC(config.reload, self);
		config.default && DEFAULT(config.default, true);

		if (!isMOBILE && config.autofocus) {
			var el = self.find(config.autofocus === true ? 'input[type="text"],select,textarea' : config.autofocus);
			el.length && el[0].focus();
		}

		setTimeout(function() {
			self.element.scrollTop(0);
			self.find('.ui-form').aclass('ui-form-animate');
		}, 300);

		// Fixes a problem with freezing of scrolling in Chrome
		setTimeout2(self.ID, function() {
			self.css('z-index', (W.$$form_level * 10) + 1);
		}, 500);
	};
});

COMPONENT('confirm', function(self) {

	var is, visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {

		self.aclass('ui-confirm hidden');

		self.event('click', 'button', function() {
			self.hide($(this).attrd('index').parseInt());
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

	self.show = self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		for (var i = 0; i < buttons.length; i++) {
			var item = buttons[i];
			var icon = item.match(/"[a-z0-9-]+"/);
			if (icon) {
				item = item.replace(icon, '').trim();
				icon = '<i class="fa fa-{0}"></i>'.format(icon.toString().replace(/"/g, ''));
			} else
				icon = '';
			builder.push('<button data-index="{1}">{2}{0}</button>'.format(item, i, icon));
		}

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.rclass('ui-confirm-visible');
		visible = false;
		setTimeout2(self.id, function() {
			$('html').rclass('noscrollconfirm');
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		$('html').aclass('noscrollconfirm');
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.rclass('hidden');
		visible = true;
		setTimeout2(self.id, function() {
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
		self.append('<div class="loading"></div>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.rclass('hidden').aclass('ui-loading-opacity', 100);
		return self;
	};

	self.hide = function(timeout) {
		pointer = setTimeout(function() {
			self.rclass('ui-loading-opacity').aclass('hidden', 100);
		}, timeout || 1);
		return self;
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

	var init = false;
	var clid = null;

	self.readonly();
	self.setter = function(value) {

		if (config.if !== value) {
			if (config.cleaner && init && !clid)
				clid = setTimeout(self.clean, config.cleaner * 60000);
			return;
		}

		if (clid) {
			clearTimeout(clid);
			clid = null;
		}

		if (init) {
			config.reload && EXEC(config.reload);
			return;
		}

		init = true;
		self.import(config.url, function() {
			config.reload && EXEC(config.reload);
		});
	};

	self.clean = function() {
		config.clean && EXEC(config.clean);
		setTimeout(function() {
			self.empty();
			init = false;
			clid = null;
		}, 1000);
	};
});

COMPONENT('preview', 'width:200;height:100;background:#FFFFFF;quality:90;schema:{file\\:base64,name\\:filename};format:{0}', function(self, config) {

	var empty, img, canvas, name, content = null;

	self.readonly();

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'width':
			case 'height':
			case 'background':
				setTimeout2(self.id + 'reinit', self.reinit, 50);
				break;
			case 'label':
			case 'icon':
				redraw = true;
				break;
		}

		redraw && setTimeout2(self.id + 'redraw', function() {
			self.redraw();
			self.refresh();
		}, 50);
	};

	self.reinit = function() {
		canvas = document.createElement('canvas');
		canvas.width = config.width;
		canvas.height = config.height;
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = config.background;
		ctx.fillRect(0, 0, config.width, config.height);
		empty = canvas.toDataURL('image/png');
		canvas = null;
	};

	self.resize = function(image) {
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext('2d');
		canvas.width = config.width;
		canvas.height = config.height;
		ctx.fillStyle = config.background;
		ctx.fillRect(0, 0, config.width, config.height);

		var w = 0;
		var h = 0;
		var x = 0;
		var y = 0;

		if (image.width < config.width && image.height < config.height) {
			w = image.width;
			h = image.height;
			x = (config.width / 2) - (image.width / 2);
			y = (config.height / 2) - (image.height / 2);
		} else if (image.width >= image.height) {
			w = config.width;
			h = image.height * (config.width / image.width);
			y = (config.height / 2) - (h / 2);
		} else {
			h = config.height;
			w = (image.width * (config.height / image.height)) >> 0;
			x = (config.width / 2) - (w / 2);
		}

		ctx.drawImage(image, x, y, w, h);
		var base64 = canvas.toDataURL('image/jpeg', config.quality * 0.01);
		img.attr('src', base64);
		self.upload(base64);
	};

	self.redraw = function() {
		var label = config.label || content;
		self.html((label ? '<div class="ui-preview-label">{0}{1}:</div>'.format(config.icon ? '<i class="fa fa-{0}"></i>'.format(config.icon) : '', label) : '') + '<input type="file" accept="image/*" class="hidden" /><img src="{0}" class="img-responsive" alt="" />'.format(empty, config.width, config.height));
		img = self.find('img');
		img.on('click', function() {
			self.find('input').trigger('click');
		});
	};

	self.make = function() {

		content = self.html();
		self.aclass('ui-preview');
		self.reinit();
		self.redraw();

		self.event('change', 'input', function() {
			var reader = new FileReader();
			reader.onload = function () {
				var image = new Image();
				image.onload = function() {
					self.resize(image);
				};
				image.src = reader.result;
			};
			var file = this.files[0];
			name = file.name;
			reader.readAsDataURL(file);
			this.value = '';
		});

		self.event('dragenter dragover dragexit drop dragleave', function (e) {

			e.stopPropagation();
			e.preventDefault();

			switch (e.type) {
				case 'drop':
					break;
				case 'dragenter':
				case 'dragover':
					return;
				case 'dragexit':
				case 'dragleave':
				default:
					return;
			}

			var dt = e.originalEvent.dataTransfer;
			if (dt && dt.files.length) {
				var reader = new FileReader();
				reader.onload = function () {
					var image = new Image();
					image.onload = function() {
						self.resize(image);
					};
					image.src = reader.result;
				};
				var file = e.originalEvent.dataTransfer.files[0];
				name = file.name;
				reader.readAsDataURL(file);
			}
		});
	};

	self.upload = function(base64) {
		if (base64) {
			var data = (new Function('base64', 'filename', 'return ' + config.schema))(base64, name);
			SETTER('loading', 'show');
			AJAX('POST ' + config.url.env(true), data, function(response, err) {
				SETTER('loading', 'hide', 100);
				if (err) {
					SETTER('snackbar', 'warning', err.toString());
				} else {
					self.change(true);
					self.set(response);
				}
			});
		}
	};

	self.setter = function(value) {
		img.attr('src', value ? config.format.format(value) : empty);
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

COMPONENT('dropdowncheckbox', 'checkicon:check;visible:0;alltext:All selected;limit:0;selectedtext:{0} selected', function(self, config) {

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
				self.datasource(value, self.bind);
				datasource && self.refresh();
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
				if (config.limit && arr.length === config.limit)
					return;
				index === -1 && arr.push(value);
			} else {
				index !== -1 && arr.splice(index, 1);
			}

			self.set(arr);
			self.change(true);
		});
	};

	self.bind = function(path, value) {
		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (value !== undefined)
			prepared = true;

		if (!value || !value.length) {
			var h = config.empty || '&nbsp;';
			if (h === self.old)
				return;
			container.aclass(clsempty).html(h);
			self.old = h;
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

		var h = HASH(render);
		if (h === self.old)
			return;

		self.old = h;

		if (render)
			container.rclass(clsempty).html(render);
		else
			container.aclass(clsempty).html(config.empty);

		self.refresh();
	};

	self.setter = function(value) {

		if (!prepared)
			return;

		var label = '';
		var count = value == null || !value.length ? undefined : value.length;

		if (value && count) {
			var remove = [];
			for (var i = 0; i < count; i++) {
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

			if (config.cleaner !== false && value) {
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

		if (!label && value && config.cleaner !== false) {
			// invalid data
			// it updates model without notification
			self.rewrite([]);
		}

		if (!label && config.placeholder) {
			values.rattr('title', '');
			values.html('<span>{0}</span>'.format(config.placeholder));
		} else {
			if (count == data.length && config.alltext !== 'null' && config.alltext)
				label = config.alltext;
			else if (config.visible && count > config.visible)
				label = config.selectedtext.format(count, data.length);
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
		else if (key === 'if')
			filter = FN('value => ' + value);
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
	var closing = {};
	var clone;
	var appdefs = CACHE('appdefs') || {};
	var oldfocus;
	var oldpos = {};
	var defsize = {};
	var appminimized = {};

	self.hidemenu = function() {
		common.startmenu && TOGGLE('common.startmenu');
	};

	self.template = Tangular.compile('<div class="ui-process ui-process-animation{{ if $.hidden }} ui-process-hidden{{ fi }}" data-id="{{ id }}">{{ if internal.resize && !$.mobile }}<div class="ui-process-resize"><span></span></div>{{ fi }}<div class="ui-process-header"><button class="ui-process-mainmenu visible-xs" name="menu"><i class="fa fa-navicon"></i></button><span class="appprogress ap{{id}}"><span></span></span><div><i class="fa fa-{{ internal.icon }}"></i>{{ internal.name }}</div><nav><button name="screenshot" class="ui-process-button ui-process-screenshot"><i class="fa fa-camera"></i></button><button name="minimize" class="ui-process-button"><i class="fa fa-window-minimize"></i></button>{{ if internal.resize && !$.mobile }}<button name="maximize-left" class="ui-process-button"><i class="fa fa-arrow-left"></i></button><button name="maximize-right" class="ui-process-button"><i class="fa fa-arrow-right"></i></button><button name="maximize" class="ui-process-button"><i class="fas fa-window-maximize"></i></button>{{ fi }}<button name="close" class="ui-process-button"><i class="fa fa-times"></i></button></nav></div><div class="ui-process-iframe-container"><div class="ui-process-loading loading"></div><iframe src="/loading.html" frameborder="0" scrolling="no" allowtransparency="true" class="ui-process-iframe"></iframe></div></div>');
	self.readonly();

	self.make = function() {
		self.append('<div class="ui-process-clone hidden"></div>');
		clone = self.find('.ui-process-clone');
	};

	var move = { is: false, x: 0, y: 0 };
	var resize = { is: false, x: 0, y: 0 };
	var w = $(window);

	self.getSize = function() {
		var w = $(window);
		var obj = {};
		obj.w = w.width();
		obj.h = w.height() - $('header').height();
		return obj;
	};

	self.getCache = function(el) {
		var off = el.offset();
		return el.width() + 'x' + el.height() + 'x' + off.left + 'x' + off.top;
	};

	self.event('mousedown touchstart', '.ui-process-button,.ui-process-mainmenu', function(e) {
		var el = $(this).closest('.ui-process');
		var id = el.attrd('id');
		switch (this.name) {
			case 'menu':
				var iframe = iframes.findItem('id', id);
				self.message(iframe, 'menu');
				break;
			case 'screenshot':
				SETTER('loading', 'show')('loading', 'hide', 2000);
				var iframe = iframes.findItem('id', id);
				self.message(iframe, 'screenshotmake');
				break;
			case 'maximize':
				self.resize_maximize(id);
				break;
			case 'maximize-left':
				self.resize_maximize(id, 2);
				break;
			case 'maximize-right':
				self.resize_maximize(id, 1);
				break;
			case 'restore':
				self.resize_maximize(id, 3);
				break;
			case 'minimize':
				self.minimize(id);
				break;
			case 'close':
				self.kill(id);
				break;
		}
		self.hidemenu();
		e.preventDefault();
		e.stopPropagation();
	});

	self.event('mousedown', '.ui-process-header', function(e) {
		var t = $(this);
		var el = t.closest('.ui-process');
		self.mdown_move(el, e.offsetX, e.offsetY + (e.target === t[0] ? 0 : e.offsetY));
		e.preventDefault();
	});

	self.event('touchstart', '.ui-process-header', function(e) {
		var el = $(this).parent();
		var o = e.touches[0];
		var off = el.offset();
		self.mdown_move(el, o.clientX - off.left, o.clientY - off.top);
		e.preventDefault();
	});

	self.event('touchstart', '.ui-process-resize', function(e) {
		var el = $(this).parent();
		var o = e.touches[0];
		self.mdown_resize(el, o.clientX, o.clientY);
		e.preventDefault();
	});

	self.event('touchend', function(e) {
		self.mup(e);
	});

	self.focus = function(id) {
		$('.appbadge[data-id="{0}"]'.format(id)).aclass('hidden');
		if (oldfocus === id)
			return;
		oldfocus = id;
		self.find('.ui-process-focus').rclass('ui-process-focus');
		self.find('.ui-process[data-id="{0}"]'.format(id)).aclass('ui-process-focus').rclass('hidden').rclass('ui-process-hidden');
		setTimeout2(self.ID + 'focus', function() {
			oldfocus = null;
		}, 1000);
	};

	self.event('mousedown', '.ui-process-resize', function(e) {
		var el = $(this).parent();
		self.mdown_resize(el, e.clientX, e.clientY);
		e.preventDefault();
	});

	self.mdown_move = function(el, x, y) {
		var iframe = iframes.findItem('id', el.attrd('id'));
		if (iframe.mobile)
			return false;
		clone.rclass('hidden');
		move.is = true;
		move.el = el;
		move.x = x;
		move.y = y;
		self.find('.ui-process-focus').rclass('ui-process-focus');
		el.aclass('ui-process-focus');
		self.hidemenu();
	};

	self.mdown_resize = function(el, x, y) {
		clone.rclass('hidden');
		resize.is = true;
		resize.el = el;
		el.find('.ui-process-button[name="maximize"]').find('.fal').rclass2('fa-').aclass('fa-window-maximize');
		resize.iframe = el.find('iframe');
		resize.padding = el.find('.ui-process-header').height();
		resize.x = x;
		resize.y = y;
		resize.w = el.width();
		resize.h = el.height();
		self.hidemenu();
	};

	self.mup = function(e) {
		if (move.is) {
			move.is = false;
			move.el.attrd('cache', '');
			clone.aclass('hidden');
			self.notifyresize(move.el.attrd('id'), true);
			e.preventDefault();
		}

		if (resize.is) {
			resize.is = false;
			resize.el.attrd('cache', '');
			clone.aclass('hidden');
			self.notifyresize(resize.el.attrd('id'));
			e.preventDefault();
		}
	};

	self.mmove = function(x, y, e) {
		if (move.is) {
			move.el.css({ left: x - move.x, top: y - move.y });
			e.preventDefault();
		} else if (resize.is) {

			var w = resize.w + (x - resize.x);
			var h = resize.h + (y - resize.y);

			if (w < 600)
				w = 600;

			if (h < 400)
				h = 400;

			resize.el.css({ width: w, height: h });
			resize.iframe.css({ height: h - resize.padding });
			setTimeout2(self.ID + 'resize', function() {
				self.notifyresize(resize.el.attrd('id'));
			}, 100, 5);
			e.preventDefault();
		}
	};

	self.resetsize = function() {
		for (var i = 0; i < iframes.length; i++) {
			var iframe = iframes[i];
			var internal = iframe.meta.internal;
			var opt = { width: internal.width, height: internal.height };

			var ol = iframe.element.css('left').parseInt();
			var ot = +iframe.element.css('top').parseInt();

			if (ol <= 0)
				opt.left = '20px';
			else if (ol + internal.width + 20 >= WW)
				opt.left = (WW - internal.width - 20) + 'px';

			if (ot <= 0)
				opt.top = '20px';
			else if (ot + internal.height >= WH)
				opt.top = (WH - internal.height - 80) + 'px';

			iframe.element.css(opt);
			iframe.iframe.css({ height: internal.height - resize.padding });
			self.notifyresize(iframe.id);
		}

	};

	self.resize_maximize = function(id, align) {

		var iframe = iframes.findItem('id', id);
		var el = iframe.element;
		var size = self.getSize();
		var cache = el.attrd('cache');

		align = align || 0;

		if (cache && oldpos[id] === align) {
			var a = cache.split('x');
			el.css({ width: +a[0], height: +a[1], left: +a[2], top: +a[3] });
			el.attrd('cache', '');
		} else {
			var w = size.w, h = size.h, l = 0, t = 0;
			switch (align) {
				case 1:
				case 2:
					w = size.w / 2;
					l = align === 1 ? w : 0;
					break;
				case 3:
					w = defsize.w;
					h = defsize.h;
					l = defsize.x;
					t = defsize.y;
					break;
			}

			if (!cache || cache.w !== w || cache.h !== h || cache.left !== l || cache.top !== t) {
				el.attrd('cache', self.getCache(el));
				el.css({ width: w, height: h, left: l, top: t });
			}
		}

		oldpos[id] = align;
		setTimeout(function(id) {
			self.notifyresize(id);
		}, 100, id);
	};

	w.on('mouseup blur', self.mup);

	w.on('mousemove', function(e) {
		if (move.is || resize.is)
			self.mmove(e.clientX, e.clientY, e);
	});

	w.on('touchmove', function(e) {
		if (move.is || resize.is) {
			var o = e.touches[0];
			self.mmove(o.clientX, o.clientY, e);
		}
	});

	self.emitevent = function(type, message) {
		for (var i = 0; i < iframes.length; i++)
			self.message(iframes[i], type, message);
	};

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

	self.message2 = function(id, type, message, callbackid, error) {
		var proc = self.findProcess(id);
		if (proc) {
			var data = {};
			data.openplatform = true;
			data.type = type;
			data.body = message;
			if (error)
				data.error = error.toString();
			if (callbackid)
				data.callback = callbackid;
			proc.element.find('iframe').get(0).contentWindow.postMessage(JSON.stringify(data), '*');
		}
	};

	self.findProcess = function(id) {
		return iframes.findItem('id', id);
	};

	self.notifyresize = function(id, skipNotify) {
		var iframe = self.findProcess(id);
		if (iframe && !iframe.mobile) {
			var el = iframe.element;
			var w = el.width();
			var h = el.height() - iframe.element.find('.ui-process-header').height();

			if (!skipNotify) {
				el.find('iframe').css('height', h);
				self.message(iframe, 'resize', { width: w, height: h });
			}

			var off = el.offset();
			appdefs[id].w = w;
			appdefs[id].h = el.height();
			appdefs[id].x = off.left;
			appdefs[id].y = off.top;
			CACHE('appdefs', appdefs, '5 months');
		}
	};

	self.notifyresize2 = function(id) {
		var iframe = self.findProcess(id);
		if (iframe && !iframe.mobile) {
			var el = iframe.element;
			var w = el.width();
			var h = el.height() - iframe.element.find('.ui-process-header').height();
			self.message(iframe, 'resize', { width: w, height: h });
		}
	};

	self.minimize = function(id) {

		if (id == null) {
			for (var i = 0; i < iframes.length; i++)
				self.minimize(iframes[i].id);
			return;
		}

		var iframe = self.findProcess(id);
		if (iframe) {
			iframe.element.aclass('hidden');
			self.message(iframe, 'minimize');
		}
		return self;
	};

	self.maximize = function(iframe) {

		if (typeof(iframe) === 'string') {
			iframe = self.findProcess(iframe);
			if (!iframe)
				return false;
		}

		iframe.element.rclass('hidden');
		self.focus(iframe.id);
		self.message(iframe, 'maximize');
	};

	self.sendnotifydata = function(iframe, data) {

		if (typeof(iframe) === 'string') {
			iframe = self.findProcess(iframe);
			if (!iframe)
				return false;
		}

		iframe.element.rclass('hidden');
		self.focus(iframe.id);
		self.message(iframe, 'notify', data);
	};

	self.reload = function(id) {
		var iframe = self.findProcess(id);
		self.message(iframe, 'reload');
	};

	self.kill = function(id) {

		if (id === undefined) {
			GET(config.datasource).forEach(function(item) {
				self.kill(item.id);
			});
			return;
		}

		var index = iframes.findIndex('id', id);
		if (index === -1)
			return self;

		var iframe = iframes[index];

		if (!iframe.meta.internal.loaded)
			return;

		iframes.splice(index, 1);
		iframe.element.aclass('hidden');
		iframe.meta.internal.loaded = false;

		self.minimize(id, false);

		$('.appclose[data-id="{0}"]'.format(id)).aclass('hidden');
		$('.app[data-id="{0}"]'.format(id)).rclass('app-running');

		closing[id] = true;

		// Timeout for iframe cleaning scripts
		setTimeout(function() {
			iframe.iframe.attr('src', 'about:blank');
			iframe.iframe.remove();
			iframe.element.off();
			iframe.element.remove();
			delete closing[id];
		}, 1000);

		var apps = GET(config.datasource);
		var item = apps.findItem('id', id);

		if (item) {
			item.internal.running = false;
			item.running = false;
			self.message(iframe, 'kill');
		}

		SET(config.datasource, apps.remove('id', id));
		SETTER('processes', 'emitevent', 'app.close', id);
		return self;
	};

	function makeurl(url, accesstoken) {

		accesstoken = encodeURIComponent(location.protocol + '//' + location.hostname + '/verify/?accesstoken=' + encodeURIComponent(accesstoken));

		var index = url.indexOf('?');
		if (index === -1)
			return url + '?openplatform=' + accesstoken;
		else
			return url.substring(0, index + 1) + 'openplatform=' + accesstoken + '&' + url.substring(index + 1);
	}

	self.wait = function(app, callback) {

		if (typeof(app) === 'string') {
			// id
			app = user.apps.findItem('id', app);
			if (!app) {
				callback(null);
				return;
			}
		}

		if (app.running) {
			var iframe = self.findProcess(app.id);
			if (iframe) {
				callback(iframe);
			} else {
				setTimeout(function() {
					self.wait(app, callback);
				}, 500);
			}
		} else {
			// RUN APP
			// MINIMIZED
			appminimized[app.id] = true;
			$('.app[data-id="{0}"]'.format(app.id)).trigger('click');
			WAIT(function() {
				return app.loaded;
			}, function() {
				self.wait(app, callback);
			});
		}
	};

	self.setter = function(value) {

		if (!value)
			return;

		if (closing[value.id]) {
			setTimeout(function(value) {
				self.setter(value);
			}, 1000, value);
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

		iframe = {};
		iframe.mobile = WIDTH() === 'xs';
		iframe.id = value.id;
		iframe.width = value.internal.width;
		iframe.hidden = appminimized[iframe.id];
		self.append(self.template(value, iframe));

		if (appminimized[iframe.id])
			delete appminimized[iframe.id];

		value.internal.running = true;
		item.running = true;
		iframe.meta = value;

		iframe.element = $('.ui-process[data-id="{0}"]'.format(value.id));
		iframe.iframe = iframe.element.find('iframe');

		iframe.iframe[0].$loaded = 0;
		iframe.iframe.on('load', function() {
			if (this.$loaded === 1) {
				setTimeout(function() {
					iframe.element.find('.ui-process-loading').aclass('hidden');
					value.internal.notifydata && self.sendnotifydata(iframe, value.internal.notifydata);
					value.internal.loaded = true;
				}, 1500);
			}
			this.$loaded++;
		});

		var margin = iframe.element.find('.ui-process-header').height();

		if (iframe.mobile) {
			var h = WH - $('header').height();
			var w = WW;
			iframe.element.css({ width: w, height: h, left: 0, top: 0 });
			iframe.iframe.css({ height: h - margin });
		} else {
			var hash = value.internal.width + 'x' + value.internal.height + 'x' + value.internal.resize;
			var def = appdefs[value.id];
			if (def && def.hash === hash) {
				defsize.w = def.w || value.internal.width;
				defsize.h = def.h || value.internal.height;
				defsize.x = def.x;
				defsize.y = def.y;
				iframe.element.css({ width: def.w, height: def.h, left: def.x, top: def.y });
				iframe.iframe.css({ height: def.h - margin });
			} else {
				var h = value.internal.height || (WH - (WH * 0.2 >> 0));
				var w = value.internal.width || (WW - (WW * 0.2 >> 0));
				var x = (WW / 2) - (w / 2);
				var y = (WH / 2) - (h / 2);
				appdefs[value.id] = { w: w, h: h, x: x, y: y, hash: hash };
				defsize.w = w;
				defsize.h = h;
				defsize.x = x;
				defsize.y = y;
				iframe.element.css({ width: w, height: h, left: x, top: y });
				iframe.iframe.css({ height: h - margin });
			}
		}

		iframe.dateopen = new Date();
		iframes.push(iframe);

		setTimeout(function() {
			var url = value.url;
			if (value.href) {
				if (value.href.substring(0, 1) === '/')
					url = (url + value.href.substring(1));
				else if (value.href.indexOf(url) !== -1)
					url = value.href;
			}
			iframe.iframe.attr('src', makeurl(url, value.accesstoken));
		}, 2500);

		setTimeout(function() {
			iframe.element.rclass('ui-process-animation');
			if (!iframe.hidden)
				self.focus(iframe.id);
		}, 500);

		UPDATE(config.datasource);
		$('.appclose[data-id="{0}"]'.format(value.id)).rclass('hidden');
		$('.app[data-id="{0}"]'.format(value.id)).aclass('app-running');
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

		$(window).on('resize', self.resize);

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

		setTimeout(self.resize, 500);
	};

	self.resize = function() {
		self.css('height', $(window).height() - $('header').height());
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

COMPONENT('textboxlist', 'maxlength:100;required:false;error:You reach the maximum limit', function (self, config) {

	var container, content;
	var empty = {};
	var skip = false;
	var cempty = 'empty';
	var helper = null;

	self.setter = null;
	self.getter = null;

	self.template = Tangular.compile('<div class="ui-textboxlist-item"><div><i class="fa fa-times"></i></div><div><input type="text" maxlength="{{ max }}" placeholder="{{ placeholder }}"{{ if disabled}} disabled="disabled"{{ fi }} value="{{ value }}" /></div></div>');

	self.configure = function (key, value, init, prev) {
		if (init)
			return;

		var redraw = false;
		switch (key) {
			case 'disabled':
				self.tclass('ui-textboxlist-required', value);
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

	self.redraw = function () {

		var icon = '';
		var html = config.label || content;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);

		empty.value = '';
		self.html((html ? '<div class="ui-textboxlist-label{2}">{1}{0}:</div>'.format(html, icon, config.required ? ' ui-textboxlist-label-required' : '') : '') + '<div class="ui-textboxlist-items"></div>' + self.template(empty).replace('-item"', '-item ui-textboxlist-base"'));
		container = self.find('.ui-textboxlist-items');
	};

	self.make = function () {

		empty.max = config.max;
		empty.placeholder = config.placeholder;
		empty.value = '';
		empty.disabled = config.disabled;

		if (config.disabled)
			self.aclass('ui-disabled');

		content = self.html();
		self.aclass('ui-textboxlist');
		self.redraw();

		self.event('click', '.fa-times', function () {

			if (config.disabled)
				return;

			var el = $(this);
			var parent = el.closest('.ui-textboxlist-item');
			var value = parent.find('input').val();
			var arr = self.get();

			helper != null && helper.remove();
			helper = null;

			parent.remove();

			var index = arr.indexOf(value);
			if (index === -1)
				return;

			arr.splice(index, 1);

			self.tclass(cempty, arr.length === 0);

			skip = true;
			self.set(arr, 2);
			self.change(true);
		});

		// PMC: added blur event for base input auto submit
		self.event('change keypress blur', 'input', function (e) {

			if ((e.type === 'keypress' && e.which !== 13) || config.disabled)
				return;

			var el = $(this);

			var value = this.value.trim();
			if (!value)
				return;

			var arr = [];
			var base = el.closest('.ui-textboxlist-base');
			var len = base.length > 0;

			if (len && e.type === 'change')
				return;

			var raw = self.get();

			if (config.limit && raw.length >= config.limit) {
				if (helper) {
					base.after('<div class="ui-textboxlist-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
					helper = container.closest('.ui-textboxlist').find('.ui-textboxlist-helper');
				}
				return;
			}

			if (len) {

				if (!raw || raw.indexOf(value) === -1)
					self.push(self.path, value, 2);

				this.value = '';
				self.change(true);
				return;
			}

			container.find('input').each(function () {
				arr.push(this.value.trim());
			});

			skip = true;
			self.set(arr, 2);
			self.change(true);
		});
	};

	self.setter = function (value) {

		if (skip) {
			skip = false;
			return;
		}

		if (!value || !value.length) {
			self.aclass(cempty);
			container.empty();
			return;
		}

		self.rclass(cempty);
		var builder = [];

		value.forEach(function (item) {
			empty.value = item;
			builder.push(self.template(empty));
		});

		container.empty().append(builder.join(''));
	};

	self.validate = function(value, init) {

		if (init)
			return true;

		var valid = !config.required;
		var items = container.children();

		if (!value || !value.length)
			return valid;

		value.forEach(function (item, i) {
			!item && (item = '');
			switch (config.type) {
				case 'email':
					valid = item.isEmail();
					break;
				case 'url':
					valid = item.isURL();
					break;
				case 'currency':
				case 'number':
					valid = item > 0;
					break;
				case 'date':
					valid = item instanceof Date && !isNaN(item.getTime());
					// TODO: date string format validation
					break;
				default:
					valid = item.length > 0;
					break;
			}
			items.eq(i).tclass('ui-textboxlist-item-invalid', !valid);
		});

		return valid;
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

COMPONENT('calendar', 'today:Set today;firstday:0;close:Close;yearselect:true;monthselect:true;yearfrom:-70 years;yearto:5 years', function(self, config) {

	var skip = false;
	var skipDay = false;
	var visible = false;

	self.days = EMPTYARRAY;
	self.months = EMPTYARRAY;
	self.months_short = EMPTYARRAY;
	self.years_from;
	self.years_to;

	self.configure = function(key, value) {
		switch (key) {
			case 'days':
				if (value instanceof Array)
					self.days = value;
				else
					self.days = value.split(',').trim();

				for (var i = 0; i < DAYS.length; i++) {
					DAYS[i] = self.days[i];
					self.days[i] = DAYS[i].substring(0, 2).toUpperCase();
				}

				break;

			case 'months':
				if (value instanceof Array)
					self.months = value;
				else
					self.months = value.split(',').trim();

				self.months_short = [];

				for (var i = 0, length = self.months.length; i < length; i++) {
					var m = self.months[i];
					MONTHS[i] = m;
					if (m.length > 4)
						m = m.substring(0, 3) + '.';
					self.months_short.push(m);
				}
				break;

			case 'yearfrom':
				if (value.indexOf('current') !== -1)
					self.years_from = parseInt(new Date().format('yyyy'));
				else
					self.years_from = parseInt(new Date().add(value).format('yyyy'));
				break;

			case 'yearto':
				if (value.indexOf('current') !== -1)
					self.years_to = parseInt(new Date().format('yyyy'));
				else
					self.years_to = parseInt(new Date().add(value).format('yyyy'));
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

	self.calculate = function(year, month, selected) {

		var d = new Date(year, month, 1, 12, 0);
		var output = { header: [], days: [], month: month, year: year };
		var firstDay = config.firstday;
		var firstCount = 0;
		var frm = d.getDay() - firstDay;
		var today = new Date();
		var ty = today.getFullYear();
		var tm = today.getMonth();
		var td = today.getDate();
		var sy = selected ? selected.getFullYear() : -1;
		var sm = selected ? selected.getMonth() : -1;
		var sd = selected ? selected.getDate() : -1;
		var days = getMonthDays(d);

		if (frm < 0)
			frm = 7 + frm;

		while (firstCount++ < 7) {
			output.header.push({ index: firstDay, name: self.days[firstDay] });
			firstDay++;
			if (firstDay > 6)
				firstDay = 0;
		}

		var index = 0;
		var indexEmpty = 0;
		var count = 0;
		var prev = getMonthDays(new Date(year, month - 1, 1, 12, 0)) - frm;
		var cur;

		for (var i = 0; i < days + frm; i++) {

			var obj = { isToday: false, isSelected: false, isEmpty: false, isFuture: false, number: 0, index: ++count };

			if (i >= frm) {
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
				cur = d.add('-' + indexEmpty + ' days');
			}

			if (!obj.isEmpty)
				cur = d.add(i + ' days');

			obj.month = i >= frm && obj.number <= days ? d.getMonth() : cur.getMonth();
			obj.year = i >= frm && obj.number <= days ? d.getFullYear() : cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		indexEmpty = 0;

		for (var i = count; i < 42; i++) {
			var cur = d.add(i + ' days');
			var obj = { isToday: false, isSelected: false, isEmpty: true, isFuture: true, number: ++indexEmpty, index: ++count };
			obj.month = cur.getMonth();
			obj.year = cur.getFullYear();
			obj.date = cur;
			output.days.push(obj);
		}

		return output;
	};

	self.hide = function() {
		if (visible) {
			self.older = null;
			self.aclass('hidden');
			self.rclass('ui-calendar-visible');
			visible = false;
		}
		return self;
	};

	self.toggle = function(el, value, callback, offset) {
		if (self.older === el.get(0)) {
			!self.hclass('hidden') && self.hide();
		} else {
			self.older = el.get(0);
			self.show(el, value, callback, offset);
		}
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
		var l = off.left + (offset || 0);
		var t = off.top + h + 12;
		var s = 250;

		if (l + s > WW) {
			var w = el.innerWidth();
			l = (l + w) - s;
		}

		self.css({ left: l, top: t });
		self.rclass('hidden');
		self.click = callback;
		self.date(value);
		visible = true;
		self.aclass('ui-calendar-visible', 50);
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

		self.event('click', '.ui-calendar-today-a', function() {
			var dt = new Date();
			self.hide();
			if (self.click) {
				if (typeof(self.click) === 'string') {
					SET(self.click, dt);
					CHANGE(self.click, true);
				} else
					self.click(dt);
			}
		});

		self.event('click', '.ui-calendar-day', function() {
			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]), 12, 0);
			self.find('.ui-calendar-selected').rclass('ui-calendar-selected');
			var el = $(this).aclass('ui-calendar-selected');
			skip = !el.hclass('ui-calendar-disabled');
			self.hide();
			if (self.click) {
				if (typeof(self.click) === 'string') {
					SET(self.click, dt);
					CHANGE(self.click, true);
				} else
					self.click(dt);
			}
		});

		self.event('click', '.ui-calendar-header', function(e) {
			e.stopPropagation();
		});

		self.event('change', '.ui-calendar-year', function(e) {

			clearTimeout2('calendarhide');
			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1, 12, 0);
			dt.setFullYear(this.value);
			skipDay = true;
			self.date(dt);
		});

		self.event('change', '.ui-calendar-month', function(e){

			clearTimeout2('calendarhide');
			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1, 12, 0);
			dt.setMonth(this.value);
			skipDay = true;
			self.date(dt);
		});

		self.event('click', 'button', function(e) {

			e.preventDefault();
			e.stopPropagation();

			var arr = this.getAttribute('data-date').split('-');
			var dt = new Date(parseInt(arr[0]), parseInt(arr[1]), 1, 12, 0);
			switch (this.name) {
				case 'prev':
					dt.setMonth(dt.getMonth() - 1);
					break;
				case 'next':
					dt.setMonth(dt.getMonth() + 1);
					break;
			}

			var current_year = dt.getFullYear();
			if (current_year < self.years_from || current_year > self.years_to)
				return;

			skipDay = true;
			self.date(dt);
		});

		$(window).on('scroll click', function() {
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

		var clssel = 'ui-calendar-selected';

		if (typeof(value) === 'string')
			value = value.parseDate();

		if (!value || isNaN(value.getTime())) {
			self.find('.' + clssel).rclass(clssel);
			value = NOW;
		}

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
			value = NOW = new Date();

		var output = self.calculate(value.getFullYear(), value.getMonth(), value);
		var builder = [];

		for (var i = 0; i < 42; i++) {

			var item = output.days[i];

			if (i % 7 === 0) {
				builder.length && builder.push('</tr>');
				builder.push('<tr>');
			}

			var cls = [];

			item.isEmpty && cls.push('ui-calendar-disabled');
			cls.push('ui-calendar-day');

			!empty && item.isSelected && cls.push(clssel);
			item.isToday && cls.push('ui-calendar-day-today');
			builder.push('<td class="{0}" data-date="{1}-{2}-{3}"><div>{3}</div></td>'.format(cls.join(' '), item.year, item.month, item.number));
		}

		builder.push('</tr>');

		var header = [];
		for (var i = 0; i < 7; i++)
			header.push('<th>{0}</th>'.format(output.header[i].name));

		var years = value.getFullYear();
		if (config.yearselect) {
			years = '';
			var current_year = value.getFullYear();
			for (var i = self.years_from; i <= self.years_to; i++)
				years += '<option value="{0}" {1}>{0}</option>'.format(i, i === current_year ? 'selected' : '');
			years = '<select data-date="{0}-{1}" class="ui-calendar-year">{2}</select>'.format(output.year, output.month, years);
		}

		var months = self.months[value.getMonth()];
		if (config.monthselect) {
			months = '';
			var current_month = value.getMonth();
			for (var i = 0, l = self.months.length; i < l; i++)
				months += '<option value="{0}" {2}>{1}</option>'.format(i, self.months[i], i === current_month ? 'selected' : '');
			months = '<select data-date="{0}-{1}" class="ui-calendar-month">{2}</select>'.format(output.year, output.month, months);
		}

		self.html('<div class="ui-calendar-header"><button class="ui-calendar-header-prev" name="prev" data-date="{0}-{1}"><span class="fa fa-arrow-left"></span></button><div class="ui-calendar-header-info">{2} {3}</div><button class="ui-calendar-header-next" name="next" data-date="{0}-{1}"><span class="fa fa-arrow-right"></span></button></div><div class="ui-calendar-table"><table cellpadding="0" cellspacing="0" border="0"><thead>{4}</thead><tbody>{5}</tbody></table></div>'.format(output.year, output.month, months, years, header.join(''), builder.join('')) + (config.today ? '<div class="ui-calendar-today"><a href="javascript:void(0)">{0}</a><a href="javascript:void(0)" class="ui-calendar-today-a"><i class="fa fa-calendar"></i>{1}</a></div>'.format(config.close, config.today) : ''));
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

COMPONENT('snackbar', 'timeout:3000;button:Dismiss', function(self, config) {

	var show = true;
	var callback;

	self.readonly();
	self.blind();
	self.make = function() {
		self.aclass('ui-snackbar hidden');
		self.append('<div><a href="javasc' + 'ript:void(0)" class="ui-snackbar-dismiss"></a><div class="ui-snackbar-body"></div></div>');
		self.event('click', '.ui-snackbar-dismiss', function() {
			self.hide();
			callback && callback();
		});
	};

	self.hide = function() {
		self.rclass('ui-snackbar-visible');
		setTimeout(function() {
			self.aclass('hidden');
		}, 1000);
		show = true;
	};

	self.success = function(message, button, close) {
		self.show('<i class="fa fa-check-circle ui-snackbar-icon"></i>' + message, button, close);
	};

	self.warning = function(message, button, close) {
		self.show('<i class="fa fa-times-circle ui-snackbar-icon"></i>' + message, button, close);
	};

	self.show = function(message, button, close) {

		if (typeof(button) === 'function') {
			close = button;
			button = null;
		}

		callback = close;

		self.find('.ui-snackbar-body').html(message);
		self.find('.ui-snackbar-dismiss').html(button || config.button);

		if (show) {
			self.rclass('hidden');
			setTimeout(function() {
				self.aclass('ui-snackbar-visible');
			}, 50);
		}

		setTimeout2(self.ID, self.hide, config.timeout + 50);
		show = false;
	};
});

COMPONENT('search', 'class:hidden;delay:200;attribute:data-search', function(self, config) {
	self.readonly();
	self.setter = function(value) {

		if (!config.selector || !config.attribute || value == null)
			return;

		KEYPRESS(function() {

			var elements = self.find(config.selector);
			if (!value) {
				elements.rclass(config.class);
				return;
			}

			var search = value.toSearch();
			var hide = [];
			var show = [];

			elements.toArray().wait(function(item, next) {
				var el = $(item);
				var val = (el.attr(config.attribute) || '').toSearch();
				if (val.indexOf(search) === -1)
					hide.push(el);
				else
					show.push(el);
				setTimeout(next, 3);
			}, function() {

				hide.forEach(function(item) {
					item.tclass(config.class, true);
				});

				show.forEach(function(item) {
					item.tclass(config.class, false);
				});
			});

		}, config.delay, 'search' + self.id);
	};
});

COMPONENT('message', function(self, config) {

	var is, visible = false;
	var timer = null;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-message hidden');

		self.event('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			visible && e.which === 27 && self.hide();
		});
	};

	self.warning = function(message, icon, fn) {
		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}
		self.callback = fn;
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.success = function(message, icon, fn) {

		if (typeof(icon) === 'function') {
			fn = icon;
			icon = undefined;
		}

		self.callback = fn;
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.callback && self.callback();
		self.rclass('ui-message-visible');
		timer && clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-message-body"><div class="text"></div><hr /><button>' + (config.button || 'Close') + '</button></div></div>');
		timer && clearTimeout(timer);
		visible = true;
		is = true;
		self.find('.ui-message-body').rclass().aclass('ui-message-body ' + cls);
		self.find('.text').html(text);
		self.rclass('hidden');
		setTimeout(function() {
			self.aclass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('listmenu', 'class:selected;selector:a;property:id;click:true', function(self, config) {

	var old, oldvalue;

	self.make = function() {
		var scr = self.find('script');
		self.template = Tangular.compile(scr.html());
		scr.remove();
	};

	self.configure = function(name, value) {
		switch (name) {
			case 'datasource':
				self.datasource(value, self.rebind);
				break;
		}
	};

	self.rebind = function(path, value) {

		if (!value.length) {
			self.empty();
			return;
		}

		var builder = [];
		var opt = { length: value.length };
		for (var i = 0; i < opt.length; i++) {
			var item = value[i];
			opt.index = i;
			builder.push(self.template(item, opt));
		}

		oldvalue = null;
		self.html(builder.join(''));

		config.click && self.find(config.selector).on('click', function() {
			var index = $(this).index();
			var item = self.get(config.datasource)[index];
			self.set(item[config.property]);
			config.exec && EXEC(config.exec, item);
		});

		self.refresh();
	};

	self.setter = function(value) {
		var arr = self.get(config.datasource);
		if (arr.length) {
			if (value === oldvalue)
				return;
			oldvalue = value;
			var index = config.property ? arr.findIndex(config.property, value) : arr.indexOf(value);
			old && old.rclass(config.class);
			index !== -1 && (old = self.find(config.selector).eq(index).aclass(config.class));
		}
	};
});

COMPONENT('shortcuts', function(self) {

	var items = [];
	var length = 0;

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		$(window).on('keydown', function(e) {
			if (length && !e.isPropagationStopped()) {
				for (var i = 0; i < length; i++) {
					var o = items[i];
					if (o.fn(e)) {
						if (o.prevent) {
							e.preventDefault();
							e.stopPropagation();
						}
						setTimeout(function(o, e) {
							o.callback(e);
						}, 100, o, e);
					}
				}
			}
		});
	};

	self.exec = function(shortcut) {
		var item = items.findItem('shortcut', shortcut.toLowerCase().replace(/\s/g, ''));
		item && item.callback(EMPTYOBJECT);
	};

	self.register = function(shortcut, callback, prevent) {
		shortcut.split(',').trim().forEach(function(shortcut) {
			var builder = [];
			var alias = [];
			shortcut.split('+').trim().forEach(function(item) {
				var lower = item.toLowerCase();
				alias.push(lower);
				switch (lower) {
					case 'ctrl':
					case 'alt':
					case 'shift':
						builder.push('e.{0}Key'.format(lower));
						return;
					case 'win':
					case 'meta':
					case 'cmd':
						builder.push('e.metaKey');
						return;
					case 'ins':
						builder.push('e.keyCode===45');
						return;
					case 'space':
						builder.push('e.keyCode===32');
						return;
					case 'tab':
						builder.push('e.keyCode===9');
						return;
					case 'esc':
						builder.push('e.keyCode===27');
						return;
					case 'enter':
						builder.push('e.keyCode===13');
						return;
					case 'backspace':
					case 'del':
					case 'delete':
						builder.push('(e.keyCode===8||e.keyCode===127)');
						return;
					case 'up':
						builder.push('e.keyCode===38');
						return;
					case 'down':
						builder.push('e.keyCode===40');
						return;
					case 'right':
						builder.push('e.keyCode===39');
						return;
					case 'left':
						builder.push('e.keyCode===37');
						return;
					case 'f1':
					case 'f2':
					case 'f3':
					case 'f4':
					case 'f5':
					case 'f6':
					case 'f7':
					case 'f8':
					case 'f9':
					case 'f10':
					case 'f11':
					case 'f12':
						var a = item.toUpperCase();
						builder.push('e.key===\'{0}\''.format(a));
						return;
					case 'capslock':
						builder.push('e.which===20');
						return;
				}

				var num = item.parseInt();
				if (num)
					builder.push('e.which===' + num);
				else
					builder.push('e.keyCode==={0}'.format(item.toUpperCase().charCodeAt(0)));
			});

			items.push({ shortcut: alias.join('+'), fn: new Function('e', 'return ' + builder.join('&&')), callback: callback, prevent: prevent });
			length = items.length;
		});
		return self;
	};
});

COMPONENT('features', 'height:37', function(self, config) {

	var container, timeout, input, search, scroller = null;
	var is = false, results = false, selectedindex = 0, resultscount = 0;

	self.oldsearch = '';
	self.items = null;
	self.template = Tangular.compile('<li data-search="{{ $.search }}" data-index="{{ $.index }}"{{ if selected }} class="selected"{{ fi }}>{{ if icon }}<i class="fa fa-{{ icon }}"></i>{{ fi }}{{ name | raw }}</li>');
	self.callback = null;
	self.readonly();
	self.singleton();

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'placeholder':
				self.find('input').prop('placeholder', value);
				break;
		}
	};

	self.make = function() {

		self.aclass('ui-features-layer hidden');
		self.append('<div class="ui-features"><div class="ui-features-search"><span><i class="fa fa-search"></i></span><div><input type="text" placeholder="{0}" class="ui-features-search-input" /></div></div><div class="ui-features-container"><ul></ul></div></div>'.format(config.placeholder));

		container = self.find('ul');
		input = self.find('input');
		search = self.find('.ui-features');
		scroller = self.find('.ui-features-container');

		self.event('touchstart mousedown', 'li[data-index]', function(e) {
			self.callback && self.callback(self.items[+this.getAttribute('data-index')]);
			self.hide();
			e.preventDefault();
			e.stopPropagation();
		});

		$(document).on('touchstart mousedown', function(e) {
			is && !$(e.target).hclass('ui-features-search-input') && self.hide(0);
		});

		$(window).on('resize', function() {
			is && self.hide(0);
		});

		self.event('keydown', 'input', function(e) {
			var o = false;
			switch (e.which) {
				case 27:
					o = true;
					self.hide();
					break;
				case 13:
					o = true;
					var sel = self.find('li.selected');
					if (sel.length && self.callback)
						self.callback(self.items[+sel.attr('data-index')]);
					self.hide();
					break;
				case 38: // up
					o = true;
					selectedindex--;
					if (selectedindex < 0)
						selectedindex = 0;
					else
						self.move();
					break;
				case 40: // down
					o = true;
					selectedindex++ ;
					if (selectedindex >= resultscount)
						selectedindex = resultscount;
					else
						self.move();
					break;
			}

			if (o && results) {
				e.preventDefault();
				e.stopPropagation();
			}
		});

		self.event('keyup', 'input', function() {
			setTimeout2(self.id, self.search, 100, null, this.value);
		});
	};

	self.search = function(value) {

		if (!value) {
			if (self.oldsearch === value)
				return;
			self.oldsearch = value;
			selectedindex = 0;
			results = true;
			resultscount = self.items.length;
			container.find('li').rclass('hidden selected');
			self.move();
			return;
		}

		if (self.oldsearch === value)
			return;

		self.oldsearch = value;
		value = value.toSearch().split(' ');
		results = false;
		resultscount = 0;
		selectedindex = 0;

		container.find('li').each(function() {
			var el = $(this);
			var val = el.attr('data-search');
			var h = false;

			for (var i = 0; i < value.length; i++) {
				if (val.indexOf(value[i]) === -1) {
					h = true;
					break;
				}
			}

			if (!h) {
				results = true;
				resultscount++;
			}

			el.tclass('hidden', h);
			el.rclass('selected');
		});
		self.move();
	};

	self.move = function() {
		var counter = 0;
		var h = scroller.css('max-height').parseInt();

		container.find('li').each(function() {
			var el = $(this);
			if (el.hclass('hidden'))
				return;
			var is = selectedindex === counter;
			el.tclass('selected', is);
			if (is) {
				var t = (config.height * counter) - config.height;
				if ((t + config.height * 5) > h)
					scroller.scrollTop(t);
				else
					scroller.scrollTop(0);
			}
			counter++;
		});
	};

	self.show = function(items, callback) {

		if (is) {
			clearTimeout(timeout);
			self.hide(0);
			return;
		}

		var type = typeof(items);
		var item;

		if (type === 'string')
			items = self.get(items);

		if (!items) {
			self.hide(0);
			return;
		}

		self.items = items;
		self.callback = callback;
		results = true;
		resultscount = self.items.length;

		input.val('');

		var builder = [];
		var indexer = {};

		for (var i = 0, length = items.length; i < length; i++) {
			item = items[i];
			indexer.index = i;
			indexer.search = (item.name + ' ' + (item.keywords || '')).trim().toSearch();
			!item.value && (item.value = item.name);
			builder.push(self.template(item, indexer));
		}

		container.html(builder);

		var W = $(window);
		var top = ((W.height() / 2) - (search.height() / 2)) - scroller.css('max-height').parseInt();
		var options = { top: top, left: (W.width() / 2) - (search.width() / 2) };

		search.css(options);
		self.move();

		if (is)
			return;

		self.rclass('hidden');

		setTimeout(function() {
			self.aclass('ui-features-visible');
		}, 100);

		!isMOBILE && setTimeout(function() {
			input.focus();
		}, 500);

		is = true;
		$('html,body').aclass('ui-features-noscroll');
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.aclass('hidden').rclass('ui-features-visible');
			self.callback = null;
			self.target = null;
			is = false;
			$('html,body').rclass('ui-features-noscroll');
		}, sleep ? sleep : 100);
	};
});