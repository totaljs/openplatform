COMPONENT('click', function() {
	var self = this;

	self.readonly();

	self.click = function() {
		var value = self.attr('data-value');
		if (typeof(value) === 'string')
			self.set(self.parser(value));
		else
			self.get(self.attr('data-component-path'))(self);
	};

	self.make = function() {

		self.element.on('click', self.click);

		var enter = self.attr('data-enter');
		if (!enter)
			return;

		$(enter).on('keydown', 'input', function(e) {
			if (e.keyCode !== 13)
				return;
			setTimeout(function() {
				if (self.element.get(0).disabled)
					return;
				self.click();
			}, 100);
		});
	};
});

COMPONENT('visible', function() {
	var self = this;
	var condition = self.attr('data-if');
	self.readonly();
	self.setter = function(value) {

		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? true : false;

		self.element.toggleClass('hidden', !is);
	};
});

COMPONENT('message', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-message hidden');

		self.element.on('click', 'button', function() {
			self.hide();
		});

		$(window).on('keyup', function(e) {
			if (!visible)
				return;
			if (e.keyCode === 27)
				self.hide();
		});
	};

	self.warning = function(message, icon) {
		self.content('ui-message-warning', message, icon || 'fa-warning');
	};

	self.success = function(message, icon) {
		self.content('ui-message-success', message, icon || 'fa-check-circle');
	};

	self.hide = function() {
		self.element.removeClass('ui-message-visible');
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text, icon) {

		if (!is)
			self.html('<div><div class="ui-message-body"><span class="fa fa-warning"></span><div class="ui-center"></div></div><button>' + (self.attr('data-button') || 'Close') + '</button></div>');

		if (timer)
			clearTimeout(timer);

		visible = true;
		self.element.find('.ui-message-body').removeClass().addClass('ui-message-body ' + cls);
		self.element.find('.fa').removeClass().addClass('fa ' + icon);
		self.element.find('.ui-center').html(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-message-visible');
		}, 5);
	};
});

COMPONENT('validation', function() {

	var self = this;
	var path;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find(self.attr('data-selector') || 'button');
		elements.prop({ disabled: true });
		self.evaluate = self.attr('data-if');
		path = self.path.replace(/\.\*$/, '');
		self.watch(self.path, self.state, true);
	};

	self.state = function() {
		var disabled = jC.disabled(path);
		if (!disabled && self.evaluate)
			disabled = !EVALUATE(self.path, self.evaluate);
		elements.prop({ disabled: disabled });
	};
});

/**
 * Checkbox
 * @version 1.0.0
 */
COMPONENT('checkbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';

	self.validate = function(value) {
		var is = false;
		var type = typeof(value);

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		return value === 'true' || value === 'on';
	};

	if (!required)
		self.noValid();

	self.make = function() {
		self.element.addClass('ui-checkbox');
		self.html('<div><i class="fa fa-check"></i></div><span{1}>{0}</span>'.format(self.html(), required ? ' class="ui-checkbox-label-required"' : ''));
		self.element.on('click', function() {
			self.dirty(false);
			self.getter(!self.get(), 2, true);
		});
	};

	self.setter = function(value) {
		self.element.toggleClass('ui-checkbox-checked', value ? true : false);
	};
});

COMPONENT('dropdown', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var select;
	var container;

	self.validate = function(value) {

		var type = typeof(value);

		if (select.prop('disabled'))
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		if (window.$calendar)
			window.$calendar.hide();

		if (self.type === 'currency' || self.type === 'number')
			return value > 0;

		return value.length > 0;
	};

	if (!required)
		self.noValid();

	self.render = function(arr) {

		var builder = [];
		var value = self.get();
		var template = '<option value="{0}"{1}>{2}</option>';
		var propText = self.attr('data-source-text') || 'name';
		var propValue = self.attr('data-source-value') || 'id';
		var emptyText = self.attr('data-empty');

		if (emptyText !== undefined)
			builder.push('<option value="">{0}</option>'.format(emptyText));

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i];
			if (item.length)
				builder.push(template.format(item, value === item ? ' selected="selected"' : '', item));
			else
				builder.push(template.format(item[propValue], value === item[propValue] ? ' selected="selected"' : '', item[propText]));
		}

		select.html(builder.join(''));

		var disabled = arr.length === 0;
		self.element.toggleClass('ui-disabled', disabled);
		select.prop('disabled', disabled);
	};

	self.make = function() {

		var options = [];

		(self.attr('data-options') || '').split(';').forEach(function(item) {
			item = item.split('|');
			options.push('<option value="{0}">{1}</option>'.format(item[1] === undefined ? item[0] : item[1], item[0]));
		});

		self.element.addClass('ui-dropdown-container');

		var label = self.html();
		var html = '<div class="ui-dropdown"><span class="fa fa-sort"></span><select data-component-bind="">{0}</select></div>'.format(options.join(''));
		var builder = [];

		if (label.length) {
			var icon = self.attr('data-icon');
			builder.push('<div class="ui-dropdown-label{0}">{1}{2}:</div>'.format(required ? ' ui-dropdown-label-required' : '', icon ? '<span class="fa {0}"></span> '.format(icon) : '', label));
			builder.push('<div class="ui-dropdown-values">{0}</div>'.format(html));
			self.html(builder.join(''));
		} else
			self.html(html).addClass('ui-dropdown-values');

		select = self.find('select');
		container = self.find('.ui-dropdown');

		var ds = self.attr('data-source');
		if (!ds)
			return;

		var prerender = function(path) {
			var value = self.get(self.attr('data-source'));
			if (NOTMODIFIED(self.id, value))
				return;
			if (!value)
				value = [];
			self.render(value);
		};

		self.watch(ds, prerender, true);
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-dropdown-invalid', self.isInvalid());
	};
});

COMPONENT('textbox', function() {

	var self = this;
	var required = self.attr('data-required') === 'true';
	var input;
	var container;

	self.validate = function(value) {

		var is = false;
		var type = typeof(value);

		if (input.prop('disabled'))
			return true;

		if (type === 'undefined' || type === 'object')
			value = '';
		else
			value = value.toString();

		if (window.$calendar)
			window.$calendar.hide();

		if (self.type === 'email')
			return value.isEmail();
		if (self.type === 'currency')
			return value > 0;
		return value.length > 0;
	};

	if (!required)
		self.noValid();

	self.make = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		attrs.attr('type', self.type === 'password' ? self.type : 'text');
		attrs.attr('placeholder', self.attr('data-placeholder'));
		attrs.attr('maxlength', self.attr('data-maxlength'));
		attrs.attr('data-component-keypress', self.attr('data-component-keypress'));
		attrs.attr('data-component-keypress-delay', self.attr('data-component-keypress-delay'));
		attrs.attr('data-component-bind', '');

		tmp = self.attr('data-align');
		if (tmp)
			attrs.attr('class', 'ui-' + tmp);

		if (self.attr('data-autofocus') === 'true')
			attrs.attr('autofocus');

		var content = self.html();
		var icon = self.attr('data-icon');
		var icon2 = self.attr('data-control-icon');
		var increment = self.attr('data-increment') === 'true';

		if (!icon2 && self.type === 'date')
			icon2 = 'fa-calendar';

		builder.push('<input {0} />'.format(attrs.join(' ')));

		if (icon2)
			builder.push('<div><span class="fa {0}"></span></div>'.format(icon2));
		else if (increment)
			builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (increment) {
			self.element.on('click', '.fa-caret-up,.fa-caret-down', function(e) {
				var el = $(this);
				var inc = -1;
				if (el.hasClass('fa-caret-up'))
					inc = 1;
				self.change(true);
				self.inc(inc);
			});
		}

		if (self.type === 'date') {
			self.element.on('click', '.fa-calendar', function(e) {
				e.preventDefault();
				if (!window.$calendar)
					return;
				var el = $(this);
				window.$calendar.toggle(el.parent().parent(), self.element.find('input').val(), function(date) {
					self.set(date);
				});
			});
		}

		if (!content.length) {
			self.element.addClass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.find('.ui-textbox');
			return;
		}

		var html = builder.join('');
		builder = [];
		builder.push('<div class="ui-textbox-label{0}">'.format(required ? ' ui-textbox-label-required' : ''));

		if (icon)
			builder.push('<span class="fa {0}"></span> '.format(icon));

		builder.push(content);
		builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));

		self.html(builder.join(''));
		self.element.addClass('ui-textbox-container');
		input = self.find('input');
		container = self.find('.ui-textbox');
	};

	self.state = function(type, who) {
		if (!type)
			return;
		var invalid = self.isInvalid();
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.toggleClass('ui-textbox-invalid', self.isInvalid());
	};
});

COMPONENT('textarea', function() {

	var self = this;
	var isRequired = self.attr('data-required') === 'true';

	this.validate = function(value) {
		var is = false;
		var t = typeof(value);

		if (t === 'undefined' || t === 'object')
			value = '';
		else
			value = value.toString();

		is = isRequired ? self.type === 'number' ? value > 0 : value.length > 0 : true;
		return is;
	};

	self.make = function() {

		var attrs = [];

		function attr(name) {
			var a = self.attr(name);
			if (!a)
				return;
			attrs.push(name.substring(name.indexOf('-') + 1) + '="' + a + '"');
		}

		attr('data-placeholder');
		attr('data-maxlength');

		var element = self.element;
		var height = element.attr('data-height');
		var icon = element.attr('data-icon');
		var content = element.html();
		var html = '<textarea data-component-bind=""' + (attrs.length > 0 ? ' ' + attrs.join('') : '') + (height ? ' style="height:' + height + '"' : '') + (element.attr('data-autofocus') === 'true' ? ' autofocus="autofocus"' : '') + '></textarea>';

		if (content.length === 0) {
			element.addClass('ui-textarea');
			element.append(html);
			return;
		}

		element.empty();
		element.append('<div class="ui-textarea-label' + (isRequired ? ' ui-textarea-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
		element.append('<div class="ui-textarea">' + html + '</div>');
	};

	self.state = function(type) {
		self.element.find('.ui-textarea').toggleClass('ui-textarea-invalid', self.isInvalid());
	};
});

COMPONENT('template', function() {
	var self = this;
	var properties;

	self.readonly();
	self.make = function(template) {

		properties = self.attr('data-properties');
		if (properties)
			properties = properties.split(',').trim();

		if (template) {
			self.template = Tangular.compile(template);
			return;
		}

		var script = self.element.find('script');

		if (!script.length) {
			script = self.element;
			self.element = self.element.parent();
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
		if (!value)
			return self.element.addClass('hidden');
		KEYPRESS(function() {
			self.html(self.template(value)).removeClass('hidden');
		}, 100, self.id);
	};
});

COMPONENT('repeater', function() {

	var self = this;
	var recompile = false;

	self.readonly();

	self.make = function() {
		var element = self.element.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-component="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			builder.push(self.template(item).replace(/\$index/g, i.toString()).replace(/\$/g, self.path + '[' + i + ']'));
		}

		self.html(builder);

		if (recompile)
		   jC.compile();
	};
});

COMPONENT('error', function() {
	var self = this;
	var element;

	self.readonly();

	self.make = function() {
		self.element.append('<ul class="ui-error hidden"></ul>');
		element = self.element.find('ul');
	};

	self.setter = function(value) {

		if (!(value instanceof Array) || !value.length) {
			element.addClass('hidden');
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++)
			builder.push('<li><span class="fa fa-times-circle"></span> ' + value[i].error + '</li>');

		element.empty();
		element.append(builder.join(''));
		element.removeClass('hidden');
	};
});

COMPONENT('page', function() {

	var self = this;
	var isProcessed = false;
	var isProcessing = false;
	var reload = self.attr('data-reload');

	self.readonly();

	self.hide = function() {
		self.set('');
	};

	self.setter = function(value) {

		if (isProcessing)
			return;

		var el = self.element;
		var is = el.attr('data-if') == value;

		if (isProcessed || !is) {
			el.toggleClass('hidden', !is);
			if (is && reload)
				self.get(reload)();
			return;
		}

		SETTER('loading', 'show');
		isProcessing = true;
		IMPORT(el.attr('data-template'), el, function() {
			isProcessing = false;

			var init = el.attr('data-init');
			if (init) {
				var fn = GET(init || '');
				if (typeof(fn) === 'function')
					fn(self);
			}

			if (reload)
				self.get(reload)();

			isProcessed = true;
			el.toggleClass('hidden', !is);
			SETTER('loading', 'hide', 1200);
		});
	};
});

COMPONENT('grid', function() {

	var self = this;
	var target;
	var page;

	self.click = function(index, row, button) {console.log(index, row, button)};
	self.make = function(template) {

		var element = self.element.find('script');

		self.template = Tangular.compile(element.html());
		self.element.on('click', 'tr', function() {});
		self.element.addClass('ui-grid');
		self.html('<div><div class="ui-grid-page"></div><table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody></tbody></table></div><div data-component="pagination" data-component-path="{0}" data-max="8" data-pages="{1}" data-items="{2}" data-target-path="{3}"></div>'.format(self.path, self.attr('data-pages'), self.attr('data-items'), self.attr('data-pagination-path')));
		self.element.on('click', 'button', function() {
			switch (this.name) {
				default:
					var index = parseInt($(this).closest('tr').attr('data-index'));
					self.click(index, self.get().items[index], this);
					break;
			}
		});

		target = self.element.find('tbody');
		page = self.element.find('.ui-grid-page');

		setTimeout(function() {
			var max = self.attr('data-max');
			if (max === 'auto')
				self.max = (Math.floor(($(window).height() - (self.element.offset().top + 150)) / 26));
			else
				self.max = parseInt(max);
			if (self.max < 10)
				self.max = 10;
		}, 10);

		return true;
	};

	self.refresh = function() {
		self.set(self.get());
	};

	self.prerender = function(index, row) {
		return self.template(row).replace('<tr', '<tr data-index="' + index + '"');
	};

	self.setter = function(value) {
		var output = [];
		var items = value.items;

		if (items) {
			for (var i = 0, length = items.length; i < length; i++)
				output.push(self.prerender(i, items[i]));
		}

		if (!output.length) {
			var empty = self.attr('data-empty');
			if (empty) {
				page.html('&nbsp;');
				output.push('<tr><td style="text-align:center;padding:50px 0;background-color:white"><div style="padding:40px 20px;border:2px solid #F0F0F0;max-width:500px;margin:0 auto;border-radius:4px">{0}</div></td></tr>'.format(empty));
			} else
				page.empty();
		} else {
			var format = self.attr('data-page');
			if (format)
				page.html(format.replace(/\#/g, value.page));
			else
				page.empty();
		}

		target.html(output);
	};
});

COMPONENT('form', function() {

	var self = this;
	var autocenter;
	var condition;

	if (!MAN.$$form) {
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($.components.findById($(this).attr('data-id')).path, '');
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				if (component.element.hasClass('hidden'))
					return;
				component.resize();
			});
		});
	}

	var hide = self.hide = function() {
		self.set('');
	};

	self.readonly();
	self.submit = function(hide) { self.hide(); };
	self.cancel = function(hide) { self.hide(); };

	self.resize = function() {
		if (!autocenter)
			return;
		var ui = self.find('.ui-form');
		var fh = ui.innerHeight();
		var wh = $(window).height();

		var r = (wh / 2) - (fh / 2);
		if (r > 30)
			ui.css({ marginTop: (r - 15) + 'px' });
		else
			ui.css({ marginTop: '20px' });
	};

	self.make = function() {
		var content = self.element.html();
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var enter = self.attr('data-enter');

		condition = self.attr('data-if');
		autocenter = self.attr('data-autocenter') !== 'false';
		self.element.empty();

		$(document.body).append('<div id="' + self._id + '" class="hidden ui-form-container"' + (self.attr('data-top') ? ' style="z-index:10"' : '') + '><div class="ui-form-container-padding"><div class="ui-form" style="max-width:' + width + '"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-id="' + self.id + '"></span>' + self.attr('data-title') + '</div>' + content + '</div></div>');

		self.element = $('#' + self._id);
		self.element.data(COM_ATTR, self);

		self.element.on('scroll', function() {
			if (window.$calendar)
				window.$calendar.hide();
		});

		self.element.find('button').on('click', function(e) {
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					if (!this.disabled)
						self[this.name](hide);
					break;
			}
		});

		if (enter === 'true') {
			self.element.on('keydown', 'input', function(e) {
				if (e.keyCode !== 13)
					return;
				var btn = self.element.find('button[name="submit"]');
				if (btn.get(0).disabled)
					return;
				self.submit(hide);
			});
		}

		return true;
	};

	self.getter = null;
	self.setter = function(value) {

		var isHidden = condition !== value;
		self.element.toggleClass('hidden', isHidden);

		if (window.$calendar)
			window.$calendar.hide();

		if (!isHidden) {
			self.resize();
			var el = self.element.find('input,select,textarea');
			if (el.length)
				el.eq(0).focus();

			self.element.animate({ scrollTop: 0 }, 0, function() {
				setTimeout(function() {
					self.element.find('.ui-form').addClass('ui-form-animate');
				}, 300);
			});

		} else
			self.element.find('.ui-form').removeClass('ui-form-animate');
	};
});

COMPONENT('dropdowncheckbox', function() {

	var self = this;
	var required = self.element.attr('data-required') === 'true';
	var datasource = '';
	var container;
	var data = [];
	var values;

	if (!window.$dropdowncheckboxtemplate)
		window.$dropdowncheckboxtemplate = Tangular.compile('<div><label><input type="checkbox" value="{{ index }}" /><span>{{ text }}</span></label></div>');

	var template = window.$dropdowncheckboxtemplate;

	self.validate = function(value) {
		return required ? value && value.length > 0 : true;
	};

	self.make = function() {

		var options = [];
		var element = self.element;
		var arr = (element.attr('data-options') || '').split(';');

		for (var i = 0, length = arr.length; i < length; i++) {
			var item = arr[i].split('|');
			var value = item[1] === undefined ? item[0] : item[1];
			if (self.type === 'number')
				value = parseInt(value);
			var obj = { value: value, text: item[0], index: i };
			options.push(template(obj));
			data.push(obj);
		}

		var content = element.html();
		var icon = element.attr('data-icon');
		var html = '<div class="ui-dropdowncheckbox"><span class="fa fa-sort"></span><div class="ui-dropdowncheckbox-selected"></div></div><div class="ui-dropdowncheckbox-values hidden">' + options.join('') + '</div>';

		if (content.length > 0) {
			element.empty();
			element.append('<div class="ui-dropdowncheckbox-label' + (required ? ' ui-dropdowncheckbox-label-required' : '') + '">' + (icon ? '<span class="fa ' + icon + '"></span> ' : '') + content + ':</div>');
			element.append(html);
		} else
			element.append(html);

		self.element.addClass('ui-dropdowncheckbox-container');
		container = self.element.find('.ui-dropdowncheckbox-values');
		values = self.element.find('.ui-dropdowncheckbox-selected');

		self.element.on('click', '.ui-dropdowncheckbox', function(e) {

			var el = $(this);
			if (el.hasClass('ui-disabled'))
				return;

			container.toggleClass('hidden');

			if (window.$dropdowncheckboxelement) {
				window.$dropdowncheckboxelement.addClass('hidden');
				window.$dropdowncheckboxelement = null;
			}

			if (!container.hasClass('hidden'))
				window.$dropdowncheckboxelement = container;

			e.stopPropagation();
		});

		self.element.on('click', 'input,label', function(e) {

			e.stopPropagation();

			var is = this.checked;
			var index = parseInt(this.value);
			var value = data[index];

			if (value === undefined)
				return;

			value = value.value;

			var arr = self.get();
			if (!(arr instanceof Array))
				arr = [];

			var index = arr.indexOf(value);

			if (is) {
				if (index === -1)
					arr.push(value);
			} else {
				if (index !== -1)
					arr.splice(index, 1);
			}

			self.reset(true);
			self.set(arr, undefined, 2);
		});

		var ds = self.attr('data-source');

		if (!ds)
			return;

		self.watch(ds, prepare);
		setTimeout(function() {
			prepare(ds, GET(ds));
		}, 500);
	};

	function prepare(path, value) {

		if (NOTMODIFIED(path, value))
			return;

		var clsempty = 'ui-dropdowncheckbox-values-empty';

		if (!value) {
			container.addClass(clsempty).empty().html(self.attr('data-empty'));
			return;
		}

		var kv = self.attr('data-source-value') || 'id';
		var kt = self.attr('data-source-text') || 'name';
		var builder = '';

		data = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var isString = typeof(value[i]) === 'string';
			var item = { value: isString ? value[i] : value[i][kv], text: isString ? value[i] : value[i][kt], index: i };
			data.push(item);
			builder += template(item);
		}

		if (builder)
			container.removeClass(clsempty).empty().append(builder);
		else
			container.addClass(clsempty).empty().html(self.attr('data-empty'));

		self.setter(self.get());
	}

	self.setter = function(value) {

		if (NOTMODIFIED(self.id, value))
			return;

		var label = '';
		var empty = self.attr('data-placeholder');

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

				if (!is)
					remove.push(selected);
			}

			var refresh = false;

			while (true) {
				var item = remove.shift();
				if (item === undefined)
					break;
				value.splice(value.indexOf(item), 1);
				refresh = true;
			}

			if (refresh)
				MAN.set(self.path, value);
		}

		container.find('input').each(function() {
			var index = parseInt(this.value);
			var checked = false;
			if (!value || !value.length)
				checked = false;
			else if (data[index])
				checked = data[index];
			if (checked)
				checked = value.indexOf(checked.value) !== -1;
			this.checked = checked;
		});

		if (!label && value) {
			// invalid data
			// it updates model without notification
			MAN.set(self.path, []);
		}

		if (!label && empty) {
			values.html('<span>{0}</span>'.format(empty));
			return;
		}

		values.html(label);
	};

	self.state = function(type) {
		self.element.find('.ui-dropdowncheckbox').toggleClass('ui-dropdowncheckbox-invalid', self.isInvalid());
	};

	if (window.$dropdowncheckboxevent)
		return;

	window.$dropdowncheckboxevent = true;
	$(document).on('click', function(e) {
		if (!window.$dropdowncheckboxelement)
			return;
		window.$dropdowncheckboxelement.addClass('hidden');
		window.$dropdowncheckboxelement = null;
	});
});

/**
 * Disable
 * @version 1.0.0
 */
COMPONENT('disable', function() {
	var self = this;
	var condition = self.attr('data-if');
	var selector = self.attr('data-selector') || 'input,texarea,select';

	self.readonly();

	self.setter = function(value) {
		var is = true;

		if (condition)
			is = EVALUATE(self.path, condition);
		else
			is = value ? false : true;

		self.find(selector).each(function() {
			var el = $(this);
			var tag = el.get(0).tagName;
			if (tag === 'INPUT' || tag === 'SELECT') {
				el.prop('disabled', is);
				el.parent().parent().toggleClass('ui-disabled', is);
				return;
			}
			el.toggleClass('ui-disabled', is);
		});
	};

	self.state = function(type) {
		self.update();
	};
});

/**
 * Confirm Message
 * @version 1.0.0
 */
COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;
	var timer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-confirm hidden');
		self.element.on('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
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

		if (self.callback)
			self.callback(index);

		self.element.removeClass('ui-confirm-visible');
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {

		if (!is)
			self.html('<div><div class="ui-confirm-body"></div></div>');

		if (timer)
			clearTimeout(timer);

		visible = true;
		self.element.find('.ui-confirm-body').empty().append(text);
		self.element.removeClass('hidden');
		setTimeout(function() {
			self.element.addClass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('loading', function() {
	var self = this;
	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.element.addClass('ui-loading');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.element.toggleClass('hidden', false);
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.element.toggleClass('hidden', true);
		}, timeout || 1);
		return self;
	};
});

/**
 * Pagination
 * @version 1.0.0
 */
COMPONENT('pagination', function() {

	var self = this;
	var nav;
	var info;
	var cachePages = 0;
	var cacheCount = 0;

	self.template = Tangular.compile('<a href="#page{{ page }}" class="page{{ if selected }} selected{{ fi }}" data-page="{{ page }}">{{ page }}</a>');
	self.readonly();
	self.make = function() {
		self.element.addClass('ui-pagination hidden');
		self.append('<div></div><nav></nav>');
		nav = self.find('nav');
		info = self.find('div');
		self.element.on('click', 'a', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var el = $(this);
			if (self.onPage)
				self.onPage(el.attr('data-page').parseInt(), el);
		});
	};

	self.onPage = function(page) {
		self.set(self.attr('data-target-path'), page);
	};

	self.getPagination = function(page, pages, max, fn) {

		var half = Math.ceil(max / 2);
		var pageFrom = page - half;
		var pageTo = page + half;
		var plus = 0;

		if (pageFrom <= 0) {
			plus = Math.abs(pageFrom);
			pageFrom = 1;
			pageTo += plus;
		}

		if (pageTo >= pages) {
			pageTo = pages;
			pageFrom = pages - max;
		}

		if (pageFrom <= 0)
			pageFrom = 1;

		if (page < half + 1) {
			pageTo++;
			if (pageTo > pages)
				pageTo--;
		}

		for (var i = pageFrom; i < pageTo + 1; i++)
			fn(i);
	};

	self.getPages = function(length, max) {
		var pages = (length - 1) / max;
		if (pages % max !== 0)
			pages = Math.floor(pages) + 1;
		if (pages === 0)
			pages = 1;
		return pages;
	};

	self.setter = function(value) {

		// value.page   --> current page index
		// value.pages  --> count of pages
		// value.count  --> count of items in DB

		var is = false;

		if (value.pages !== undefined) {
			if (value.pages !== cachePages || value.count !== cacheCount) {
				cachePages = value.pages;
				cacheCount = value.count;
				is = true;
			}
		}

		var builder = [];

		if (cachePages > 2) {
			var prev = value.page - 1;
			if (prev <= 0)
				prev = cachePages;
			builder.push('<a href="#prev" class="page" data-page="{0}"><span class="fa fa-arrow-left"></span></a>'.format(prev));
		}

		var max = self.attr('data-max');
		if (max)
			max = max.parseInt();
		else
			max = 8;

		self.getPagination(value.page, cachePages, max, function(index) {
			builder.push(self.template({ page: index, selected: value.page === index }));
		});

		if (cachePages > 2) {
			var next = value.page + 1;
			if (next > cachePages)
				next = 1;
			builder.push('<a href="#next" class="page" data-page="{0}"><span class="fa fa-arrow-right"></span></a>'.format(next));
		}

		nav.empty().append(builder.join(''));

		if (!is)
			return;

		if (cachePages > 1) {
			var pluralize_pages = [cachePages];
			var pluralize_items = [cacheCount];

			pluralize_pages.push.apply(pluralize_pages, self.attr('data-pages').split(',').trim());
			pluralize_items.push.apply(pluralize_items, self.attr('data-items').split(',').trim());

			info.empty().append(Tangular.helpers.pluralize.apply(value, pluralize_pages) + ' / ' + Tangular.helpers.pluralize.apply(value, pluralize_items));
			self.element.toggleClass('hidden', false);
		} else
			self.element.toggleClass('hidden', true);
	};
});

COMPONENT('photoupload', function() {

	var self = this;
	var input;
	var last;

	self.readonly();

	self.make = function() {
		var id = 'photoupload' + self.id;

		self.element.addClass('ui-photoupload');
		self.html('<img src="/img/face.jpg" alt="" class="img-responsive" />');
		$(document.body).append('<input type="file" id="{0}" class="hidden" accept="image/*" />'.format(id));

		input = $('#' + id);

		self.element.on('click', function() {
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

			if (loading)
				loading.show();

			jC.UPLOAD(self.attr('data-url'), data, function(response, err) {

				if (loading)
					loading.hide(500);

				if (err) {
					var message = FIND('message');
					if (message)
						message.warning(self.attr('data-upload-error') || err.toString());
					else
						alert(self.attr('data-upload-error') || err.toString());
					return;
				}

				last = self.get();
				self.find('img').attr('src', Tangular.helpers.photo(last) + '?ts=' + Date.now());
				el.value = '';
			});
		});
	};

	self.setter = function(value) {
		if (value && !value.isEmail())
			value = '';

		if (last === value)
			return;

		last = value;
		self.find('img').attr('src', Tangular.helpers.photo(value) + (value ? '?ts=' + Date.now() : ''));
	};
});

COMPONENT('tagger', function() {

	var self = this;
	var elements;

	self.readonly();

	self.make = function() {
		elements = self.find('[data-name]');
		elements.each(function() {
			this.$tagger = {};
			this.$tagger.def = this.innerHTML;
		});
	};

	self.arrow = function(value) {
		return FN(value.replace(/\&gt\;/g, '>').replace(/\&lt\;/g, '<').replace(/\&amp\;/g, '&'));
	};

	self.setter = function(value) {

		if (!value) {
			self.element.addClass('hidden');
			return;
		}

		// self.element.toggleClass('transparent', true).removeClass('hidden');
		elements.each(function() {

			var name = this.getAttribute('data-name');
			var format = this.getAttribute('data-format');
			var type = this.getAttribute('data-type');
			var visible = this.getAttribute('data-visible');
			var before = this.getAttribute('data-before');
			var after = this.getAttribute('data-after');
			var val = name ? GET(name, value) : value;
			var key;
			var cache = this.$tagger;

			if (format) {
				key = 'format';
				if (!cache[key])
					format = cache[key] = self.arrow(format);
				else
					format = cache[key];
			}

			var typeval = typeof(val);

			switch (type) {
				case 'date':
					if (typeval === 'string')
						val = val.parseDate();
					else if (typeval === 'number')
						val = new Date(val);
					else
						val = '';
					break;

				case 'number':
				case 'currency':
					if (typeval === 'string')
						val = val.parseFloat();
					if (typeof(val) !== 'number')
						val = '';
					break;
			}

			if ((val || val === 0) && format)
				val = format(val);

			if (visible) {
				key = 'visible';
				if (!cache[key])
					visible = cache[key] = self.arrow(visible);
				else
					visible = cache[key];
				var is = visible(val);
				$(this).toggleClass('hidden', !is);
				return;
			}

			val = val === null || val === undefined ? '' : val.toString();

			if (val && !format)
				val = Ta.helpers.encode(val);

			if (val) {
				if (this.innerHTML !== val)
					this.innerHTML = (before ? before : '') + val + (after ? after : '');
				return;
			}

			if (this.innerHTML !== cache.def)
				this.innerHTML = cache.def;
		});
		self.element.removeClass('transparent hidden');
	};
});

COMPONENT('process', function() {

	var self = this;
	var iframe;

	self.launched = false;
	self.visibled = false;

	self.readonly();

	self.make = function() {
		self.element.addClass('ui-process');
		self.append('<iframe src="/loading.html" class="hidden" frameworkder="0"></iframe><div></div>');
		iframe = self.element.find('iframe');
	};

	self.close = function() {

		var launched = self.attr('data-path-launched');
		var arr = self.get(launched);
		var index = arr.findIndex(self.id);

		if (index === -1)
			return;

		arr.splice(index, 1);
		UPDATE(launched);

		iframe.attr('src', '/loading.html');
		self.launched = false;
		self.visibled = false;
	};

	self.setter = function(value) {

		if (value !== self.id) {
			self.element.toggleClass('hidden', true);
			self.visibled = false;
			return;
		}

		self.element.toggleClass('hidden', false);
		self.visibled = true;

		if (self.launched)
			return;

		setTimeout(function() {
			self.element.find('div').addClass('visible');
		}, 500);

		self.launched = true;
		setTimeout(function() {

			self.element.toggleClass('hidden', false);

			// Loads application
			iframe.attr('src', self.attr('data-url'));

			// Registers app into the launched apps
			var launched = self.attr('data-path-launched');
			if (launched)
				self.push(launched, self.id);

			setTimeout(function() {
				iframe.removeClass('hidden');
			}, 500);

			setTimeout(function() {
				self.element.find('div').remove();
			}, 1000);
		}, 1000);
	};
});

COMPONENT('toolbar', function() {
	var self = this;
	self.readonly();

	self.make = function() {
		self.html('<div class="logo"><svg width="30px" height="30px" viewBox="0 0 200 200" version="1.1" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:1.41421;"><path d="M74.819,0l-74.819,43.266l0,86.532l74.819,43.265l75.181,-43.265l0,-86.532l-75.181,-43.266ZM74.318,54.683l27.682,15.924l0,32.049l-27.682,16.025l-27.818,-16.025l0,-32.049l27.818,-15.924Z" style="fill:#17A0CB;fill-rule:nonzero;"/><path d="M37.049,21.598l-37.049,21.552l0,86.532l37.103,21.578l22.147,-38.642l0,0.046l-29.934,0l14.953,-26.248l-14.953,-26.252l29.934,0l0,0.103l-22.201,-38.669Z" style="fill:#4FC1E9;fill-rule:nonzero;"/><path class="logo-animation-a" d="M33.633,63.164l12.697,23.005l-12.697,23.495l26.936,0l13.49,-23.453l-13.49,-23.047l-26.936,0Z" style="fill:#4FC1E9;fill-rule:nonzero;"/></svg></div><label></label><button name="close" class="close"><span class="fa fa-times-circle"></span></button>');
		self.element.addClass('ui-process-toolbar hidden');
		self.element.on('click', 'button', function() {
			switch (this.name) {
				case 'close':
					self.set('');
					break;
			}
		});
	};

	self.setter = function(value) {

		if (!value) {
			self.element.toggleClass('hidden', true);
			return;
		}

		self.element.toggleClass('hidden', false);
		FIND('process', true).forEach(function(component) {
			if (component.id === value)
				self.find('label').html(component.attr('data-name'));
		});
	};
});

