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

COMPONENT('range', function() {
	var self = this;
	var required = self.attr('data-required');

	self.noValid();

	self.make = function() {
		var icon = self.attr('data-icon');
		var name = self.html();

		if (icon)
			icon = '<i class="fa {0}"></i>'.format(icon);

		if (name)
			name = '<div class="ui-range-label{1}">{2}{0}:</div>'.format(name, required ? ' ui-range-label-required' : '', icon);
		var attrs = [];
		attrs.attr('step', self.attr('data-step'));
		attrs.attr('max', self.attr('data-max'));
		attrs.attr('min', self.attr('data-min'));
		self.element.addClass('ui-range');
		self.html('{0}<input type="range" data-component-bind=""{1} />'.format(name, attrs.length ? ' ' + attrs.join(' ') : ''));
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
				output.push('<tr><td style="background-color:#F0F0F0;text-align:center;padding:50px 0"><div style="padding:40px 20px;border:2px solid #E0E0E0;max-width:500px;margin:0 auto;border-radius:4px">{0}</div></td></tr>'.format(empty));
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

	if (!MAN.$$form) {
		window.$$form_level = window.$$form_level || 1;
		MAN.$$form = true;
		$(document).on('click', '.ui-form-button-close', function() {
			SET($.components.findById($(this).attr('data-id')).path, '');
			window.$$form_level--;
		});

		$(window).on('resize', function() {
			FIND('form', true).forEach(function(component) {
				!component.element.hasClass('hidden') && component.resize();
			});
		});

		$(document).on('click', '.ui-form-container', function(e) {
			var el = $(e.target);
			if (!(el.hasClass('ui-form-container-padding') || el.hasClass('ui-form-container')))
				return;
			var form = $(this).find('.ui-form');
			var cls = 'ui-form-animate-click';
			form.addClass(cls);
			setTimeout(function() {
				form.removeClass(cls);
			}, 300);
		});
	}

	self.readonly();
	self.submit = function(hide) { self.hide(); };
	self.cancel = function(hide) { self.hide(); };
	self.onHide = function(){};

	var hide = self.hide = function() {
		self.set('');
		self.onHide();
	};

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
		var width = self.attr('data-width') || '800px';
		var submit = self.attr('data-submit');
		var enter = self.attr('data-enter');
		autocenter = self.attr('data-autocenter') === 'true';
		self.condition = self.attr('data-if');

		$(document.body).append('<div id="{0}" class="hidden ui-form-container"><div class="ui-form-container-padding"><div class="ui-form" style="max-width:{1}"><div class="ui-form-title"><span class="fa fa-times ui-form-button-close" data-id="{2}"></span>{3}</div>{4}</div></div>'.format(self._id, width, self.id, self.attr('data-title')));

		self.element.data(COM_ATTR, self);
		var el = $('#' + self._id);
		el.find('.ui-form').get(0).appendChild(self.element.get(0));
		self.element = el;

		self.element.on('scroll', function() {
			EXEC('$calendar.hide');
		});

		self.element.find('button').on('click', function(e) {
			window.$$form_level--;
			switch (this.name) {
				case 'submit':
					self.submit(hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](hide);
					break;
			}
		});

		enter === 'true' && self.element.on('keydown', 'input', function(e) {
			e.keyCode === 13 && self.element.find('button[name="submit"]').get(0).disabled && self.submit(hide);
		});

		return true;
	};

	self.getter = null;
	self.setter = function(value) {

		var isHidden = self.condition !== value;
		self.element.toggleClass('hidden', isHidden);
		EXEC('$calendar.hide');

		if (isHidden) {
			self.element.find('.ui-form').removeClass('ui-form-animate');
			return;
		}

		self.resize();
		var el = self.element.find('input,select,textarea');
		el.length > 0 && el.eq(0).focus();
		window.$$form_level++;
		self.element.css('z-index', window.$$form_level * 10);
		self.element.animate({ scrollTop: 0 }, 0, function() {
			setTimeout(function() {
				self.element.find('.ui-form').addClass('ui-form-animate');
			}, 300);
		});
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

		if (NOTMODIFIED(self.id, value))
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

COMPONENT('confirm', function() {
	var self = this;
	var is = false;
	var visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('ui-confirm hidden', true);
		self.element.on('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.element.on('click', function(e) {
			if (e.target.tagName !== 'DIV')
				return;
			var el = self.element.find('.ui-confirm-body');
			el.addClass('ui-confirm-click');
			setTimeout(function() {
				el.removeClass('ui-confirm-click');
			}, 300);
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
		self.element.removeClass('ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.element.addClass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		visible = true;
		self.element.find('.ui-confirm-body').empty().append(text);
		self.element.removeClass('hidden');
		setTimeout2(self.id, function() {
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
				self.set(last);
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

COMPONENT('applications', function() {

	var self = this;
	var running = self.attr('data-running') === 'true';

	self.template = Tangular.compile('<div class="col-lg-2 col-md-3 col-sm-3 col-xs-6 ui-app{{ if !online }} offline{{ fi }}{{ if !mobile }} hidden-xs hidden-sm{{ fi }}" data-id="{{ id }}">{0}<div><img src="{{ icon }}" alt="{{ title }}" border="0" onerror="onImageError(this)" class="img-responsive img-rounded" /><div class="name">{{ if running }}<i class="fa fa-circle"></i>{{ fi }}{{ title }}</div><span class="version">v{{ version }}</span></div></div>'.format(running ? '<i class="fa fa-times-circle"></i>' : ''));
	self.readonly();

	self.make = function() {
		self.toggle('row applications');
		self.element.on('click', '.ui-app', function() {
			var el = $(this);
			if (el.hasClass('offline'))
				return;
			SET(self.attr('data-run'), el.attr('data-id'));
		});

		self.element.on('click', '.fa-times-circle', function(e) {
			e.preventDefault();
			e.stopPropagation();
			SETTER('loading', 'show');
			SETTER('processes', 'kill', $(this).closest('.ui-app').attr('data-id'));
			SETTER('loading', 'hide', 1000);
		});
	};

	self.setter = function(value, path) {

		var apps = self.find('.ui-app');
		var builder = [];
		var processes = [];
		var stamp = Math.floor(Math.random() * 10000);

		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];

			if (item.service)
				continue;

			var el = apps.filter('[data-id="{0}"]'.format(item.id));

			el.attr('data-stamp', stamp);

			if (!el.length) {
				if (running && !item.running)
					continue;
				builder.push(self.template(item));
				continue;
			}

			if (running && !item.running) {
				el.remove();
				continue;
			}

			var img = el.find('img');

			if (!item.online) {
				if (img.attr('src') !== '/img/empty.png')
					img.attr('src', item.icon);
			} else
				img.attr('src', item.icon);

			el.find('.name').html((item.running ? '<i class="fa fa-circle"></i>' : '') + item.title);
			el.find('.version').html('v' + item.version);
			el.toggleClass('offline', !item.online);
		}

		if (builder.length)
			self.append(builder.join(''));

		apps.filter('[data-stamp!="{0}"]'.format(stamp)).remove();
	};
});

COMPONENT('processes-dock', function() {
	var self = this;
	var target;

	self.template = Tangular.compile('<a href="javascript:void(0)" data-id="{{ id }}" title="{{ title }}"><img src="{{ icon }}" width="25" alt="{{ title }}" border="0" /></a>');
	self.readonly();

	self.make = function() {
		self.toggle('ui-processes-dock hidden-xs hidden-sm');
		self.element.on('click', 'a', function() {
			SET(self.attr('data-run'), $(this).attr('data-id'));
		});
	};

	self.setter = function(value) {
		var builder = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			if (!item.running)
				continue;
			builder.push(self.template(item));
			if (builder.length > 8)
				break;
		}

		self.toggle('hidden', builder.length <= 1);

		if (builder.length > 1) {
			builder = builder.join('');
			if (NOTMODIFIED(self.id, builder))
				return;
			self.html(builder);
		}
	};
});

COMPONENT('processes', function() {

	var self = this;
	var iframes = [];
	var toolbar;
	var source;
	var redirect;
	var loader;
	var current_title = document.title;

	self.template = Tangular.compile('<div class="ui-process ui-process-animation" data-id="{{ id }}" data-token="{{ $.token }}"><iframe src="/loading.html" frameborder="0" scrolling="no"></iframe><div>');
	self.singleton();
	self.readonly();

	self.message = function(item, type, message, callbackid, error) {
		var data = {};
		data.openplatform = true;
		data.type = type;
		data.body = message;

		if (error)
			data.error = error;

		if (callbackid)
			data.callback = callbackid;
		item.element.find('iframe').get(0).contentWindow.postMessage(JSON.stringify(data), '*');
		return true;
	};

	self.makeurl = function(url, app) {
		var qs = 'openplatform={0}'.format(encodeURIComponent(common.url + '/session/?token=' + app.token));
		var index = url.indexOf('?');
		if (index === -1)
			return url + '?' + qs;
		return url + '&' + qs;
	};

	self.findItem = function(obj) {
		for (var i = 0, length = iframes.length; i < length; i++) {
			if (iframes[i].iframe.get(0).contentWindow === obj)
				return iframes[i];
		}
	};

	self.make = function() {

		source = self.attr('data-source');
		self.html('<div class="ui-process-toolbar-loading"></div><div class="ui-process-toolbar hidden"><div class="logo"><svg width="30px" height="30px" viewBox="0 0 200 200" version="1.1" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:1.41421;"><path d="M74.819,0l-74.819,43.266l0,86.532l74.819,43.265l75.181,-43.265l0,-86.532l-75.181,-43.266ZM74.318,54.683l27.682,15.924l0,32.049l-27.682,16.025l-27.818,-16.025l0,-32.049l27.818,-15.924Z" style="fill:#17A0CB;fill-rule:nonzero;"/><path d="M37.049,21.598l-37.049,21.552l0,86.532l37.103,21.578l22.147,-38.642l0,0.046l-29.934,0l14.953,-26.248l-14.953,-26.252l29.934,0l0,0.103l-22.201,-38.669Z" style="fill:#4FC1E9;fill-rule:nonzero;"/><path class="logo-animation-a" d="M33.633,63.164l12.697,23.005l-12.697,23.495l26.936,0l13.49,-23.453l-13.49,-23.047l-26.936,0Z" style="fill:#4FC1E9;fill-rule:nonzero;"/></svg></div><div data-component="processes-dock" data-component-path="{0}" data-run="{1}"></div><label></label><button name="close" class="close"><span class="fa fa-times-circle"></span></button></div>'.format(source, self.path));

		loader = self.find('.ui-process-toolbar-loading');
		toolbar = self.find('.ui-process-toolbar');

		toolbar.on('click', 'button', function() {
			switch (this.name) {
				case 'close':
					self.set('');
					break;
			}
		});

		toolbar.on('click', '.logo', function() {
			self.set('');
		});
	};

	self.is = function() {
		return toolbar.hasClass('hidden') === false;
	};

	self.minimize = function() {

		iframes.forEach(function(item) {
			if (item.element.hasClass('hidden'))
				return;
			item.element.addClass('hidden');
			self.message(item, 'minimize');
		});

		toolbar.addClass('hidden');
		$('html').removeClass('noscroll');
		document.title = current_title;
		return self;
	};

	self.kill = function(id) {

		var index = iframes.findIndex('id', id);
		if (index === -1)
			return self;

		var iframe = iframes[index];
		iframes.splice(index, 1);

		if (!iframe.element.hasClass('hidden')) {
			iframe.element.addClass('hidden');
			self.minimize();
			location.hash = '';
		}

		// Timeout for iframe cleaning scripts
		setTimeout(function() {
			iframe.iframe.attr('src', 'about:blank');
			iframe.element.remove();
		}, 2000);

		var apps = GET(source);
		var item = apps.findItem('id', id);

		if (item) {
			item.running = false;
			self.message(iframe, 'kill');
		}

		UPDATE(source);
		return self;
	};

	self.open = function(id, url) {
		var item = GET(source).findItem('id', id);
		if (!item)
			return;

		var iframe = iframes.findItem('id', id);
		if (!iframe) {
			redirect = url || item.url;
			self.set(id);
			SETTER('loading', 'show');
			return self;
		}

		SETTER('loading', 'show');

		if (iframe.element.hasClass('hidden'))
			self.minimize();

		iframe.element.removeClass('hidden');
		if (url)
			iframe.iframe.attr('src', self.makeurl(url, item));

		SETTER('loading', 'hide', 1000);
		self.title(iframe.title);
		self.message(iframe, 'maximize');
		location.hash = item.linker;
		return self;
	};

	self.title = function(value) {
		toolbar.find('label').text(value);
		toolbar.removeClass('hidden');
		$('html').addClass('noscroll');
		document.title = current_title + ': ' + value;
		return self;
	};

	self.setter = function(value) {

		self.minimize();

		if (!value) {
			location.hash = '';
			return;
		}

		var item = GET(source).findItem('id', value);
		if (!item)
			return;

		var iframe = iframes.findItem('id', value);
		if (iframe) {
			self.message(iframe, 'maximize');
			self.title(iframe.title);
			iframe.element.removeClass('hidden');
			location.hash = item.linker;
			return;
		}

		iframe = {};
		iframe.token = (Math.random() * 1000000 >> 0).toString();
		self.append(self.template(item, iframe));
		item.running = true;
		iframe.id = item.id;
		iframe.title = item.title;
		iframe.element = self.find('[data-token="{0}"]'.format(iframe.token));
		iframe.iframe = iframe.element.find('iframe');
		iframe.dateopened = new Date();
		iframe.session = item.url_session;
		iframes.push(iframe);

		setTimeout(function() {
			iframe.element.removeClass('ui-process-animation');
		}, 200);

		location.hash = item.linker;

		if (item.url_session) {
			createSession(iframe.iframe, self.makeurl(item.url_session, item), function() {
				setTimeout(function() {
					iframe.iframe.attr('src', self.makeurl(redirect || item.url, item));
					redirect = '';
				}, 1000);
			});
		} else {
			setTimeout(function() {
				iframe.iframe.attr('src', self.makeurl(redirect || item.url, item));
				redirect = '';
			}, 1500);
		}

		loader.css({ width: 0 }).removeClass('hidden');
		loader.delay(100).animate({ width: '100%' }, 1000, function() {
			loader.addClass('hidden');
		});

		SETTER('loading', 'hide', 4000);
		UPDATE(source, 100);
		self.title(iframe.title);
	};
});

COMPONENT('notifications', function() {
	var self = this;
	var loaded = false;
	var sum = -1;

	self.template = Tangular.compile('<div class="notification{{ if type === 1 }} notification-success{{ fi }}{{ if type === 2 }} notification-alert{{ fi }}" data-id="{{ openplatform }}" data-url="{{ url }}" data-internal="{{ id }}"><img src="{{ icon }}" alt="{{ title }}" border="0" /><div><div class="header"><i class="fa fa-times-circle"></i>{{ title }}<span>{{ datecreated | time }}</span></div>{{ body }}</div></div>');
	self.readonly();
	self.singleton();

	self.make = function() {
		self.toggle('notifications');

		self.watch(self.attr('data-source'), function(value) {
			if (value && value.length)
				self.load();
		}, true);

		self.element.on('click', '.fa-times-circle', function(e) {
			e.preventDefault();
			e.stopPropagation();
			var el = $(this).closest('.notification');
			var id = el.attr('data-internal');
			var items = self.get();
			var index = items.findIndex('id', parseInt(id));
			if (index === -1)
				return;
			items.splice(index, 1);
			self.save();
			self.update();
		});

		self.element.on('click', '.notification-clear', function() {
			self.set([]);
			self.save();
		});

		self.element.on('click', '.notification', function(e) {
			var el = $(this);
			var id = el.attr('data-id');
			var url = el.attr('data-url');

			setTimeout(function() {
				el.find('.fa-times-circle').trigger('click');
			}, 1000);

			if (!id) {
				if (url)
					window.open(url);
				return;
			}

			var apps = GET(self.attr('data-source'));
			var app = apps.findItem('id', id);
			if (!app || app.service)
				return;
			SETTER('processes', 'open', app.id, url);
		});

		$(window).on('resize', self.resize);
		setTimeout(self.resize, 300);
	};

	self.resize = function() {
		var w = WIDTH();
		var h = w === 'lg' || w === 'md' ? $(window).height() - (self.element.offset().top + 50) : 'auto';
		self.element.css({ height: h });
	};

	self.load = function() {
		if (loaded)
			return self;
		var local = localStorage.getItem('op_notifications' + HASH(user.id));
		if (local)
			self.set(JSON.parse(local));
		loaded = true;
		return self;
	};

	self.save = function() {
		if (!loaded)
			return;
		localStorage.setItem('op_notifications' + HASH(user.id), JSON.stringify(self.get()));
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			if (sum === 0)
				return;
			sum = 0;
			self.html('<div class="notification-empty"><i class="fa fa-check-circle"></i>{0}</div>'.format(self.attr('data-label-empty')));
			return;
		}

		if (sum === value.length)
			return;

		sum = value.length;

		var builder = [];
		var apps = GET(self.attr('data-source'));
		var missing = [];

		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];

			// OP
			if (!item.internal) {
				item.id = i;
				item.icon = '/img/system.png';
				item.title = document.title;
				builder.push(self.template(item));
				continue;
			}

			var app = apps.findItem('internal', item.internal);
			if (!app) {
				missing.push(item.internal);
				continue;
			}

			item.id = i;
			item.icon = app.icon;
			item.title = app.title;
			item.openplatform = app.id;

			builder.push(self.template(item));
		}

		if (builder.length) {
			if (builder.length > 15)
				builder = builder.take(15);
			builder = '<div class="notification-clear"><a href="javasc' + 'ript:void(0)"><i class="fa fa-trash"></i>{0}</a></div>'.format(self.attr('data-label-clear')) + builder.join('');
		}

		self.html(builder);
		setTimeout(function() { self.save(); }, 50);

		if (!missing.length)
			return;

		for (var i = 0, length = missing.length; i < length; i++) {
			var index = value.findIndex('internal', missing[i]);
			if (index !== -1)
				value.splice(index, 1);
		}
	};
});

COMPONENT('audio', function() {
	var self = this;
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

		if (!can || self.disabled || !user.sounds)
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
		return self;
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

COMPONENT('widgets', function() {
	var self = this;
	var source;
	var widgets = {};
	var items = [];
	var interval = 0;
	var empty = '<svg></svg>';
	var charts = {};

	self.template = Tangular.compile('<div class="{{ if size === 1 }}col-md-4 col-sm-4{{ fi }}{{ if size === 2 }}col-sm-8{{ fi }}{{ if size === 3 }}col-md-12{{ fi }} widget" data-id="{{ id }}" data-internal="{{ interval }}"><div style="background:{{ background }};color:{{ color }}"><div class="widget-title"><img src="{{ $.icon }}" width="12" alt="{{ $.name }}" />{{ $.name }}: {{ name }}</div><div class="widget-svg"><div class="widget-loading"><i class="fa fa-spin fa-spinner fa-2x"></i></div></div></div></div>');
	self.readonly();
	self.make = function() {
		self.toggle('row widgets hidden');
		source = self.attr('data-source');
		self.watch(source, function(path, value) {
			if (!value)
				return;
			self.update();
		});

		self.element.on('click', '.widget', function() {
			var el = $(this);
			var arr = el.attr('data-id').split('X');

			arr[0] = arr[0].parseInt();
			arr[1] = arr[1].parseInt();

			if (!widgets[arr[1]])
				return;

			var apps = GET(source);
			var app = apps.findItem('internal', arr[0]);
			if (!app)
				return;
			var widget = app.widgets.findItem('internal', arr[1]);
			if (!widget)
				return;
			SETTER('processes', 'open', app.id, widget.redirect || app.url);
		});

		setInterval(function() {
			var length = items.length;
			if (!length)
				return;
			interval++;
			var sum = interval * 1000;
			for (var i = 0; i < length; i++) {
				if (sum % items[i].interval === 0)
					self.reload(items[i], interval);
			}
		}, 1000);
	};

	self.clear = function() {
		Object.keys(charts).forEach(function(key) {
			charts[key].destroy();
			delete charts[key];
		});

		Object.keys(widgets).forEach(function(key) {
			delete widgets[key];
		});

		items.forEach(function(item) {
			item.element.closest('.widget').remove();
		});

		items = [];
	};

	self.reload = function(item, index) {
		if (!item.app.online || !item.app.widgets)
			return;

		var widget = item.app.widgets.findItem('id', item.id);
		if (!widget)
			return;

		AJAX('GET /internal/dashboard/widgets/{0}/?ts={1}'.format(item.id, self.id + 'X' + index), function(response) {

			if (!response)
				return self.empty();

			var hash;

			if (response.isJSON()) {

				hash = HASH(response);
				if (hash === item.hash)
					return;

				item.hash = hash;
				response = JSON.parse(response);
				// chart.js
				if (charts[item.id])
					charts[item.id].destroy();
				else
					item.element.html('<div style="padding:10px"><canvas width="{0}" height="{1}"></canvas></div>'.format(widget.size === 1 ? 380 : widget.size === 2 ? 580 : 780, widget.size === 1 ? 234 : widget.size === 2 ? 154 : 194));

				charts[item.id] = new Chart(item.element.find('canvas').get(0), response);
				return;
			}

			var svg = response.toString().trim();
			if (!svg.startsWith('<svg'))
				return item.element.html(empty);
			var index = svg.indexOf('>');
			if (index === -1)
				return item.element.html(empty);
			svg = svg.replace(/id\=".*?\"/g, '').replace(/\s{2,}/g, ' ').replace(/\s+\>/g, '>').replace(/\<script.*?\<\/script\>/gi, '');
			hash = HASH(svg);
			if (hash === item.hash)
				return;
			item.hash = hash;
			item.element.html('<svg width="{0}" height="250" version="1.0" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" viewBox="0 0 {0} 250">'.format(widget.size === 1 ? 400 : widget.size === 2 ? 600 : 800) + svg.substring(index + 1));
		});
	};

	self.setter = function(value, path) {

		if (!value) {
			self.toggle('hidden', true);
			return;
		}

		if (NOTMODIFIED(self.id, value))
			return;

		self.clear();

		var apps = GET(source);
		var has = false;

		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i].split('X');
			var a = item[0].parseInt();
			var b = item[1].parseInt();
			var app = apps.findItem('internal', a);
			if (!app || !app.widgets || app.service)
				continue;
			var widget = app.widgets.findItem('internal', b);
			if (!widget)
				continue;
			has = true;
			if (widgets[widget.internal])
				continue;
			widgets[widget.internal] = true;
			widget.id = app.internal + 'X' + widget.internal;
			self.append(self.template(widget, app));
			var obj = { id: widget.id, element: self.find('[data-id="{0}"] .widget-svg'.format(widget.id)), interval: widget.interval, app: app };
			items.push(obj);
			(function(obj) {
				setTimeout(function() {
					self.reload(obj, 0);
				}, 1000);
			})(obj);
		}

		self.toggle('hidden', !has);
	};
});