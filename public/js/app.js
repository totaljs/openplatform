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

var TTIC = ['#1abc9c','#2ecc71','#3498db','#9b59b6','#34495e','#16a085','#2980b9','#8e44ad','#2c3e50','#f1c40f','#e67e22','#e74c3c','#d35400','#c0392b'];

Thelpers.time2 = function(value) {
	return '<span class="ta-time" data-time="{0}" title="{2}">{1}</span>'.format(value.getTime(), Thelpers.time(value), value.format(null));
};

Thelpers.icon = function(val) {
	return (val.indexOf('fa-') === -1) ? ('fa-' + ((/\sfar|fab|fas|fal$/).test(val) ? val : (val + ' fa'))) : val;
};

ON('knockknock', function() {
	$('.ta-time').each(function() {
		var el = $(this);
		el.html(Thelpers.time(new Date(+el.attrd('time'))));
	});
});

Thelpers.initials = function(value) {
	var index = value.indexOf('.');
	var arr = value.substring(index + 1).replace(/\s{2,}/g, ' ').trim().split(' ');
	var initials = ((arr[0].substring(0, 1) + (arr[1] || '').substring(0, 1))).toUpperCase();
	var sum = 0;
	for (var i = 0; i < value.length; i++)
		sum += value.charCodeAt(i);
	return '<span class="initials" style="background-color:{1}" title="{2}">{0}</span>'.format(initials, TTIC[sum % TTIC.length], value);
};

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

Thelpers.filesize = function(value, decimals, type) {
	return value ? value.filesize(decimals, type) : '...';
};

Number.prototype.filesize = function(decimals, type) {

	if (typeof(decimals) === 'string') {
		var tmp = type;
		type = decimals;
		decimals = tmp;
	}

	var value;
	var t = this;

	// this === bytes
	switch (type) {
		case 'bytes':
			value = t;
			break;
		case 'KB':
			value = t / 1024;
			break;
		case 'MB':
			value = filesizehelper(t, 2);
			break;
		case 'GB':
			value = filesizehelper(t, 3);
			break;
		case 'TB':
			value = filesizehelper(t, 4);
			break;
		default:

			type = 'bytes';
			value = t;

			if (value > 1023) {
				value = value / 1024;
				type = 'KB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'MB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'GB';
			}

			if (value > 1023) {
				value = value / 1024;
				type = 'TB';
			}

			break;
	}

	type = ' ' + type;
	return (decimals === undefined ? value.format(2).replace('.00', '') : value.format(decimals)) + type;
};

function filesizehelper(number, count) {
	while (count--) {
		number = number / 1024;
		if (number.toFixed(3) === '0.000')
			return 0;
	}
	return number;
}

Thelpers.color = function(value) {
	var hash = HASH(value, true);
	var color = '#';
	for (var i = 0; i < 3; i++) {
		var value = (hash >> (i * 8)) & 0xFF;
		color += ('00' + value.toString(16)).substr(-2);
	}
	return color;
};

// Component: j-Parameters
// Version: 1
// Updated: 2019-11-27 15:30
COMPONENT('parameters','search:Search;dateformat:yyyy-MM-dd;offset:5;margin:0',function(self,config,cls){var cls2='.'+cls,container,search,scroller,skip;self.readonly();self.nocompile();self.bindvisible();self.init=function(){Thelpers.ui_parameters_value=function(val,format){if(val instanceof Date)return val.format(format);if(typeof(val)==='number')return val;return val?Thelpers.encode(val.toString()):''};Thelpers.ui_parameters_label=function(){return this.label||this.name}};self.template=Tangular.compile('<div class="{0}-item{{ if modified}} {0}-modified{{ fi}}" data-index="{{ $.index}}" data-search="{{ $.search}}"><div class="{0}-value{{ if unit}} {0}-unit{{ fi}}{{ if invalid}} {0}-invalid{{ fi}}">{{ if unit}}<span>{{ unit}}</span>{{ fi}}{{ if type === \'boolean\' }}<div class="{0}-boolean">{{ if value}}true{{ else}}false{{ fi}}</div>{{ else}}<div><input class="{0}-input" data-type="{{ type}}" value="{{ value | ui_parameters_value(\'{1}\') }}" placeholder="{{ placeholder}}"/></div>{{ fi}}</div><div class="{0}-type">{{ type}}</div><div class="{0}-name" title="{{ name | ui_parameters_label}}">{{ name | ui_parameters_label}}</div></div>'.format(cls,config.dateformat));self.search=function(){var val=search.find('input').val().toSearch();search.find('i').rclass('fa-').tclass('fa-search',!val).tclass('fa-times',!!val);self.find(cls2+'-item').each(function(){var el=$(this);el.tclass('hidden',val?el.attrd('search').indexOf(val)===-1:false)});self.scrollbar.resize()};self.resize=function(){var h=0;if(config.height>0)h=config.height;else if(config.parent)h=(config.parent==='window'?WH:config.parent==='parent'?self.parent().height():self.closest(config.parent).height())-search.height()-config.offset;h-=config.margin;scroller.css('height',h);self.scrollbar&&self.scrollbar.resize()};self.resize2=function(){setTimeout2(self.ID,self.resize,500)};self.make=function(){self.aclass(cls+(config.hidetype?(' '+cls+'-hidetype'):''));self.append('<div class="{0}-search"><span><i class="fa fa-search"></i></span><div><input type="text" placeholder="{1}" maxlength="50" class="{0}-searchinput" /></div></div><div class="{0}-scroller"><div class="{0}-container"></div></div>'.format(cls,config.search));container=self.find(cls2+'-container');search=self.find(cls2+'-search');scroller=self.find(cls2+'-scroller');self.resize();self.scrollbar=SCROLLBAR(scroller);search.on('keydown',cls2+'-searchinput',function(){setTimeout2(self.ID,self.search,300)});container.on('keydown',cls2+'-input',function(e){if(e.which!==38&&e.which!==40)return;var t=this,type=t.getAttribute('data-type');if(type!=='number'&&type!=='date')return;var row=$(t).closest(cls2+'-item');var index=+row.attrd('index');var item=self.get()[index];var val=t.value;if(item.type==='number'){val=val.replace(',','.');val=+val}else if(item.type==='date')val=val.parseDate(config.dateformat);switch(e.which){case 38:if(item.type==='date')val=val.add('1 day').format(config.dateformat);else val+=1;e.preventDefault();break;case 40:if(item.type==='date')val=val.add('-1 day').format(config.dateformat);else val-=1;e.preventDefault();break}this.value=val+''});search.on('click','.fa-times',function(){search.find('input').val('');self.search()});container.on('dblclick',cls2+'-boolean',function(){var el=$(this).parent();var row=el.closest(cls2+'-item');var index=+row.attrd('index');var item=self.get()[index];var indexer={index:index,search:item.name.toSearch()};skip=true;item.value=!item.value;item.modified=item.prev!==item.value;row.replaceWith(self.template(item,indexer));item.modified&&self.change(true);UPD(self.path,2)});var skipblur=false;container.on('change blur',cls2+'-input',function(e){if(skipblur)return;if(e.type==='change'){setTimeout(function(){skipblur=false},300);skipblur=true}var el=$(this);var row=el.closest(cls2+'-item');var index=+row.attrd('index');var item=self.get()[index];var indexer={index:index,search:item.name.toSearch()};item.value=el.val();switch(item.type){case'date':item.value=item.value?item.value.parseDate(config.dateformat):null;if(item.value&&isNaN(item.value.getTime())){item.invalid=true;item.value=item.prev}else item.invalid=false;if(!item.invalid)item.invalid=(item.min?item.min>item.value:false)||(item.max?item.max<item.value:false);var a=item.value?item.value.format(config.dateformat):0;var b=item.prev?item.prev.format(config.dateformat):0;item.modified=a!==b;break;case'number':var val=item.value.parseFloat();item.invalid=(item.min!=null&&val<item.min)||(item.max!=null&&val>item.max);if(!item.invalid)item.value=val;item.modified=item.value!==item.prev;break;default:item.modified=item.value!==(item.prev==null?'':item.prev);break}row.replaceWith(self.template(item,indexer));item.modified&&self.change(true);skip=true;UPD(self.path,2)});self.on('resize + resize2',self.resize2);self.resize();self.scrollbar.resize()};self.setter=function(value){if(!value)return;if(skip){skip=false;return}var builder=[],indexer={};for(var i=0;i<value.length;i++){var item=value[i];indexer.index=i;indexer.search=item.name.toSearch();item.prev=item.type==='date'&&item.value?item.value.format(config.dateformat):item.value;builder.push(self.template(item,indexer))}container.html(builder.join(''));self.search();self.resize()}});
// End: j-Parameters
