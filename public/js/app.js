var TBG = ['#1abc9c','#2ecc71','#3498db','#9b59b6','#34495e','#16a085','#2980b9','#8e44ad','#2c3e50','#f1c40f','#e67e22','#e74c3c','#d35400','#c0392b'];

Thelpers.bgcolor = function(val) {
	var sum = 0;
	var count = 0;
	for (var i = 0; i < 10; i++) {
		var code = val.charCodeAt(i);
		if (code > 47) {
			sum += code;
			if (count++ > 1)
				break;
		}
	}
	return '<span style="background-color:{0}" class="tbgcolor">{1}</span>'.format(TBG[+sum % val.length] || TBG[0], val);
};

Thelpers.icon = function(val) {
	return Thelpers.encode('fa-' + ((/\sfar$/).test(val) ? val : (val + ' fa')));
};

Thelpers.join = function(val, divider) {
	return val ? Thelpers.encode(val.join(divider == null ? ', ' : divider)) : '';
};

Thelpers.joinbgcolor = function(val, divider) {

	if (!val || !val.length)
		return '';

	var builder = [];
	for (var i = 0; i < val.length; i++)
		builder.push(Thelpers.bgcolor(Thelpers.encode(val[i])));
	return builder ? builder.join(divider == null ? ', ' : divider) : '';
};

Thelpers.language = function(val) {
	var lng = languages.findItem('id', val);
	return lng ? lng.name : '';
};

Thelpers.contract = function(val) {
	return contracts.findValue('id', val, 'name');
};

Thelpers.checkbox = function(val) {
	return '<i class="fa-{0}"></i>'.format(val ? 'check-square green fa' : 'square far');
};

function resizelayout() {
	var h = $(window).height();
	$('.scroller').each(function() {
		var el = $(this);
		var m = el.attrd('margin');

		if (m)
			m = +m;
		else
			m = 0;

		el.css('height', h - (el.offset().top + m));
	});

	var el = $('.marketplace');
	el.length && el.css({ height: WH - el.offset().top, width: el.parent().width() });
}

function onImageError(image) {
	// image.onerror = null;
	image.src = '/img/empty.png';
	return true;
}

COMPONENT('filter', 'reset:Reset;apply:Apply;cancel:Cancel', function(self, config) {

	var cls = 'ui-filter';
	var cls2 = '.' + cls;
	var events = {};
	var is = false;
	var container, timeout;

	self.singleton();
	self.readonly();
	self.nocompile && self.nocompile();

	self.bindevents = function() {
		if (!is)
			$(W).on('scroll', events.resize).on('resize', events.resize);
	};

	self.unbindevents = function() {
		if (is)
			$(W).off('scroll', events.resize).off('resize', events.resize);
	};

	self.make = function() {
		self.aclass(cls + ' hidden');
		self.append('<div class="' + cls + '-items"></div><div class="' + cls + '-buttons"><button name="reset">{reset}</button><button name="apply"><i class="fa fa-filter"></i>{apply}</button><button name="cancel">{cancel}</button></div>'.arg(config));
		container = self.find(cls2 + '-items');

		self.event('click', 'button', function(e) {
			e.preventDefault();
			var t = this;
			if (t.name === 'cancel') {
				self.hide(1);
			} else if (t.name === 'reset') {

				for (var i = 0; i < self.opt.items.length; i++) {
					var item = self.opt.items[i];
					var key = item.name || item.label;
					delete self.opt.value[key];
				}

				self.opt.callback(self.opt.value, null, null, false);
				self.hide(1);
			} else {

				var obj = {};
				var changed = [];
				var keys = [];
				var is = false;

				for (var i = 0; i < self.opt.items.length; i++) {
					var item = self.opt.items[i];
					var key = item.name || item.label;
					if (item.current != undefined) {
						if (self.opt.clean && item.type === Boolean && item.current === false) {
							item.current = undefined;
							delete self.opt.value[key];
							delete obj[key];
						} else
							self.opt.value[key] = obj[key] = item.current;
						item.changed && changed.push(key);
					} else {
						delete self.opt.value[key];
						item.changed && changed.push(key);
					}

					keys.push(key);
				}

				for (var i = 0; i < keys.length; i++) {
					if (self.opt.value[keys[i]] != null) {
						is = true;
						break;
					}
				}

				self.opt.callback(self.opt.value, changed, keys, is);
				self.hide(1);
			}
		});

		self.event('change', 'input', function() {
			var el = $(this);
			el = el.closest(cls2 + '-item');
			self.val(el, this.value);
		});

		self.event('input', 'input', function() {
			var t = this;
			if (t.$prev != t.value) {
				t.$prev = t.value;
				$(t).closest(cls2 + '-item').find(cls2 + '-placeholder').tclass('hidden', !!t.value);
			}
		});

		self.event('click', cls2 + '-checkbox', function() {
			var el = $(this);
			var is = !el.hclass(cls + '-checkbox-checked');
			el = el.closest(cls2 + '-item');
			self.val(el, is);
		});

		self.event('click', cls2 + '-icon-click,' + cls2 + '-placeholder', function() {

			var el = $(this).closest(cls2 + '-item');
			var item = self.opt.items[+el.attrd('index')];
			var opt;

			if (item.type === Date) {
				opt = {};
				opt.offsetX = -5;
				opt.offsetY = -5;
				opt.value = item.current || NOW;
				opt.element = el.find('input');
				opt.callback = function(date) {
					self.val(el, date);
				};
				SETTER('datepicker', 'show', opt);
			} else if (item.type instanceof Array) {
				el.find(cls2 + '-option').trigger('click');
			} else if (item.type === 'Time') {
				opt = {};
				opt.offsetX = -5;
				opt.offsetY = -5;
				opt.value = item.current || NOW;
				opt.element = el.find('input');
				opt.callback = function(date) {
					self.val(el, date);
				};
				SETTER('timepicker', 'show', opt);
			} else
				el.find('input').focus();
		});

		self.event('click', cls2 + '-option', function() {

			var el = $(this).closest(cls2 + '-item');
			var item = self.opt.items[+el.attrd('index')];
			var opt = {};

			opt.element = el;
			opt.items = item.type;
			opt.offsetWidth = -20;
			opt.placeholder = 'Search';
			opt.offsetX = 10;
			opt.offsetY = 10;
			opt.key = item.dirkey;

			if (item.dirempty || item.dirempty === '')
				opt.empty = item.dirempty || item.placeholder;

			opt.callback = function(selected, el, custom) {

				if (custom)
					return;

				if (typeof(selected) === 'string')
					self.val(opt.element, selected);
				else
					self.val(opt.element, selected ? selected[item.dirvalue] : null);
			};

			SETTER('directory', 'show', opt);
		});

		events.resize = function() {
			is && self.hide(1);
		};

		self.on('reflow', events.resize);
		self.on('scroll', events.resize);
		self.on('resize', events.resize);
	};

	self.val = function(el, val, init) {

		var item = self.opt.items[+el.attrd('index')];
		var type = typeof(val);
		var tmp;

		if (item.type instanceof Array) {
			if (typeof(item.type[0]) === 'string') {

				if (val === null) {
					// EMPTY
					el.find(cls2 + '-option').html('');
					item.current = undefined;
				} else {
					tmp = item.type.indexOf(val);
					if (tmp !== -1) {
						el.find(cls2 + '-option').html(val);
						item.current = val;
					}
				}

			} else {
				item.current = val;
				val = val == null ? '' : item.type.findValue(item.dirvalue, val, item.dirkey, '');
				el.find(cls2 + '-option').html(val);
			}
		} else {
			switch (item.type) {
				case Date:
					if (type === 'string')
						val = val ? val.parseDate(item.format) : '';
					break;
				case Number:
					if (type === 'string')
						val = val.parseFloat();
					break;
				case Boolean:
					el.find(cls2 + '-checkbox').tclass(cls + '-checkbox-checked', init ? val === true : val);
					break;
				case 'Time':
					if (type === 'string') {
						val = val ? val.parseDate(item.format) : '';
						item.current.setHours(val.getHours());
						item.current.setMinutes(val.getMinutes());
						item.current.setSeconds(val.getSeconds());
					}
					break;
			}
			item.current = val;
			val = val ? item.format ? val.format(item.format) : val : '';
			item.input && (el.find('input').val(val)[0].$prev = val);
		}

		if (!init)
			item.changed = true;

		item.placeholder && el.find(cls2 + '-placeholder').tclass('hidden', !!val);
	};

	self.show = function(opt) {

		var el = opt.element instanceof jQuery ? opt.element[0] : opt.element.element ? opt.element.dom : opt.element;

		if (is) {
			clearTimeout(timeout);
			if (self.target === el) {
				self.hide(1);
				return;
			}
		}

		var builder = [];
		for (var i = 0; i < opt.items.length; i++) {
			var item = opt.items[i];
			var value = '';

			if (item.type instanceof Array) {
				value = '<div class="' + cls + '-option"></div>';
				item.icon = 'chevron-down';
				item.iconclick = true;

				if (!item.dirkey)
					item.dirkey = 'name';

				if (!item.dirvalue)
					item.dirvalue = 'id';

			} else {
				switch (item.type) {
					case Date:
						item.icon = 'calendar';
						item.input = true;
						item.iconclick = true;
						if (!item.format)
							item.format = 'yyyy–MM–dd';
						item.maxlength = item.format.length;
						break;
					case Number:
						item.input = true;
						item.iconclick = true;
						break;
					case String:
						item.input = true;
						item.iconclick = true;
						break;
					case Boolean:
						value = '<div class="{0}-checkbox"><i class="fa fa-check"></i></div>'.format(cls);
						break;
					case 'Time':
						item.input = true;
						item.iconclick = true;
						item.icon = 'clock-o';
						if (!item.format)
							item.format = 'HH:mm';
						item.maxlength = item.format.length;
						break;
				}
			}

			if (item.input) {
				value = '<input type="text" />';
				if (item.maxlength)
					value = value.replace('/>', 'maxlength="' + item.maxlength + '" />');
			}

			if (item.icon)
				value = '<div class="{0}-item-icon{3}">{1}</div><div class="{0}-item-input">{2}</div>'.format(cls, item.icon.charAt(0) === '!' ? item.icon.substring(1) : '<i class="fa fa-{0}"></i>'.format(item.icon), value, item.iconclick ? (' ' + cls + '-icon-click') : '');

			if (opt.value && !item.current)
				item.current = opt.value[item.name];

			builder.push('<div class="{0}-item" data-index="{3}"><div class="{0}-item-label">{1}</div><div class="{0}-item-value"><div class="{0}-placeholder">{4}</div>{2}</div></div>'.format(cls, item.label || item.name, value, i, item.placeholder || ''));
		}

		container.html(builder.join(''));

		if (!opt.value)
			opt.value = {};

		self.opt = opt;
		self.target = el;

		self.find(cls2 + '-item').each(function() {
			var el = $(this);
			var index = +el.attrd('index');
			self.val(el, self.opt.items[index].current, true);
		});

		el = $(el);

		self.rclass('hidden');

		var css = {};
		var off = el.offset();
		var w = self.width();

		if (opt.element) {
			switch (opt.align) {
				case 'center':
					css.left = Math.ceil((off.left - w / 2) + (el.innerWidth() / 2));
					break;
				case 'right':
					css.left = (off.left - w) + el.innerWidth();
					break;
				default:
					css.left = off.left;
					break;
			}

			css.top = opt.position === 'bottom' ? (off.top - self.element.height() - 10) : (off.top + el.innerHeight() + 10);
		}

		css.width = opt.width || null;

		if (opt.offsetX)
			css.left += opt.offsetX;

		if (opt.offsetY)
			css.top += opt.offsetY;

		self.element.css(css);
		self.aclass(cls + '-visible', 100);
		self.bindevents();
		is = true;
	};

	self.hide = function(sleep) {
		if (!is)
			return;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			self.unbindevents();
			self.rclass(cls + '-visible').aclass('hidden');
			if (self.opt)
				self.opt = null;
			is = false;
		}, sleep ? sleep : 100);
	};
});