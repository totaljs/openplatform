COMPONENT('time', function(self, config, cls) {

	var cls2 = '.' + cls;

	self.readonly();
	self.blind();
	self.nocompile();

	self.make = function() {

		self.append('<div class="{0}-time"></div><div class="{0}-date b"></div>'.format(cls));

		var time = self.find(cls2 + '-time');
		var date = self.find(cls2 + '-date');

		var index = 0;

		self.bindtime = function() {
			index++;

			if (index > 10000000)
				index = 0;

			var dt = new Date();
			time.html(dt.format((user.timeformat === 12 ? '!' : '') + 'HH{0}mm{0}ss' + (user.timeformat === 12 ? ' a' : '')).format(index % 2 ? ':' : ' '));
			if (index % 15 === 0 || index === 1)
				date.html(dt.format('dddd').substring(0, 3) + ' ' + dt.format('d MMM yyyy'));
		};

		setInterval(self.bindtime, 1000);
		self.bindtime();
	};
});

COMPONENT('windowed', 'menuicon:fa fa-navicon;reoffsetresize:0;marginleft:0;margintop:0;marginright:0;marginbottom:0', function(self, config, cls) {

	var cls2 = '.' + cls;
	var cache = {};
	var events = {};
	var drag = {};
	var prevfocused;
	var serviceid;
	var data = [];
	var lastWW = WW;
	var lastWH = WH;
	var resetcounter = 0;

	self.readonly();

	self.make = function() {
		self.aclass(cls);
		self.event('click', cls2 + '-control', function() {
			var el = $(this);
			var name = el.attrd('name');
			var item = cache[el.closest(cls2 + '-item').attrd('id')];
			switch (name) {
				case 'close':
					item.setcommand('close');
					break;
				case 'minimize':
					item.setcommand('toggleminimize');
					break;
				case 'maximize':
					item.setcommand('togglemaximize');
					break;
				case 'menu':
					EMIT('menu', el, item.meta);
					break;
				default:
					item.setcommand(name);
					break;
			}
		});

		self.event('mousedown touchstart', cls2 + '-item', function() {
			if (prevfocused) {
				if (prevfocused[0] == this)
					return;
				prevfocused.rclass(cls + '-focused');
			}
			prevfocused = $(this).aclass(cls + '-focused');
			SETTER('!menu/hide', true);
			self.resetbody();
		});

		self.event('mousedown touchstart', cls2 + '-title,' + cls2 + '-resize', events.down);
		self.on('resize2', self.resize2);
		serviceid = setInterval(events.service, 5000);
	};

	self.resetbody = function() {
		$('html,body').scrollTop(0);
	};

	self.finditem = function(id) {
		return cache[id];
	};

	self.send = function(type, body) {
		for (var i = 0; i < data.length; i++)
			data[i].meta.data(type, body, data[i].element);
	};

	self.destroy = function() {
		clearInterval(serviceid);
	};

	self.resize2 = function() {
		setTimeout2(self.ID, self.resize, 200);
	};

	self.recompile = function() {
		setTimeout2(self.ID + 'compile', COMPILE, 50);
	};

	self.resizeforce = function() {

		self.element.find(cls2 + '-maximized').each(function() {
			cache[$(this).attrd('id')].setcommand('maximize');
		});

		if (config.reoffsetresize) {
			var diffWW = lastWW - WW;
			var diffWH = lastWH - WH;

			var keys = Object.keys(cache);
			for (var i = 0; i < keys.length; i++) {
				var win = cache[keys[i]];
				win.setoffset(win.x - diffWW, win.y - diffWH);
			}

			lastWW = WW;
			lastWH = WH;
		}
	};

	self.resize = function() {
		setTimeout2(self.ID + 'resize', self.resizeforce, 300);
	};

	events.down = function(e) {

		var E = e;

		if (e.type === 'touchstart') {
			drag.touch = true;
			e = e.touches[0];
		} else
			drag.touch = false;

		if (e.target.nodeName === 'I')
			return;

		var el = $(this);
		var parent = el.closest(cls2 + '-item');

		if (parent.hclass(cls + '-maximized'))
			return;

		drag.resize = el.hclass(cls + '-resize');
		drag.is = false;

		E.preventDefault();

		var myoffset = self.element.position();
		var pos;

		if (drag.resize) {
			var c = el.attr('class');
			drag.el = el.closest(cls2 + '-item');
			drag.dir = c.match(/-(tl|tr|bl|br)/)[0].substring(1);
			pos = drag.el.position();
			var m = self.element.offset();
			drag.body = drag.el.find(cls2 + '-body');
			drag.plus = m;
			drag.x = pos.left;
			drag.y = pos.top;
			drag.width = drag.el.width();
			drag.height = drag.body.height();
		} else {
			drag.el = el.closest(cls2 + '-item');
			pos = drag.el.position();
			drag.x = e.pageX - pos.left;
			drag.y = e.pageY - pos.top;
		}

		drag.el.aclass(cls + '-block');
		drag.offX = myoffset.left;
		drag.offY = myoffset.top;
		drag.item = cache[drag.el.attrd('id')];

		if (drag.item.meta.actions) {
			if (drag.resize) {
				if (drag.item.meta.actions.resize == false)
					return;
				drag.resize = drag.item.meta.actions.resize;
			} else {
				if (drag.item.meta.actions.move == false)
					return;
			}
		}

		$('body').aclass(cls + '-moving');
		drag.el.aclass(cls + '-dragged');
		$(W).on('mousemove touchmove', events.move).on('mouseup touchend', events.up);
		SETTER('!menu/hide', true);
	};

	events.move = function(e) {

		var evt = e;
		if (drag.touch)
			evt = e.touches[0];

		var obj = {};
		drag.is = true;

		if (drag.resize) {

			var x = evt.pageX - drag.offX - drag.plus.left;
			var y = evt.pageY - drag.offY - drag.plus.top;
			var off = drag.item.meta;
			var w;
			var h;

			switch (drag.dir) {

				case 'tl':
					obj.left = x;
					obj.top = y;
					w = drag.width - (x - drag.x);
					h = drag.height - (y - drag.y);

					if ((off.minwidth && w < off.minwidth) || (off.minheight && h < off.minheight) || (off.maxwidth && w > off.maxwidth) || (off.maxheight && h > off.maxheight))
						break;

					if (drag.resize === true || drag.resize === 'width') {
						obj.width = w;
						drag.el.css(obj);
					}

					if (drag.resize === true || drag.resize === 'height') {
						obj.height = h;
						delete obj.width;
						delete obj.top;
						drag.body.css(obj);
					}
					break;

				case 'tr':
					w = x - drag.x;
					h = drag.height - (y - drag.y);

					if ((off.minwidth && w < off.minwidth) || (off.minheight && h < off.minheight) || (off.maxwidth && w > off.maxwidth) || (off.maxheight && h > off.maxheight))
						break;

					if (drag.resize === true || drag.resize === 'width') {
						obj.width = w;
						obj.top = y;
						drag.el.css(obj);
					}

					if (drag.resize === true || drag.resize === 'height') {
						obj.height = h;
						delete obj.width;
						delete obj.top;
						drag.body.css(obj);
					}

					break;

				case 'bl':

					w = drag.width - (x - drag.x);
					h = y - drag.y - 30;

					if ((off.minwidth && w < off.minwidth) || (off.minheight && h < off.minheight) || (off.maxwidth && w > off.maxwidth) || (off.maxheight && h > off.maxheight))
						break;

					if (drag.resize === true || drag.resize === 'width') {
						obj.left = x;
						obj.width = w;
						drag.el.css(obj);
						delete obj.width;
					}

					if (drag.resize === true || drag.resize === 'height') {
						obj.height = h;
						drag.body.css(obj);
					}

					break;

				case 'br':
					w = x - drag.x;
					h = y - drag.y - 30;

					if ((off.minwidth && w < off.minwidth) || (off.minheight && h < off.minheight) || (off.maxwidth && w > off.maxwidth) || (off.maxheight && h > off.maxheight))
						break;

					if (drag.resize === true || drag.resize === 'width') {
						obj.width = w;
						drag.el.css(obj);
						delete obj.width;
					}

					if (drag.resize === true || drag.resize === 'height') {
						obj.height = h;
						drag.body.css(obj);
					}

					break;
			}

			drag.item.ert && clearTimeout(drag.item.ert);
			drag.item.ert = setTimeout(drag.item.emitresize, 100);

		} else {
			obj.left = evt.pageX - drag.x - drag.offX;
			obj.top = evt.pageY - drag.y - drag.offY;

			if (obj.top < 0)
				obj.top = 0;

			drag.el.css(obj);
		}

		if (!drag.touch)
			e.preventDefault();
	};

	events.up = function() {

		drag.el.rclass(cls + '-dragged').rclass(cls + '-block');
		$(W).off('mousemove touchmove', events.move).off('mouseup touchend', events.up);
		$('body').rclass(cls + '-moving');
		self.resetbody();
		resetcounter = 0;

		if (!drag.is)
			return;

		var item = drag.item;
		var meta = item.meta;
		var pos = drag.el.position();

		drag.is = false;
		drag.x = meta.x = item.x = pos.left;
		drag.y = meta.y = item.y = pos.top;

		if (drag.resize) {
			item.width = meta.width = drag.el.width();
			item.height = meta.height = drag.body.height();
		}

		meta.move && meta.move.call(item, item.x, item.y, drag.body);
		self.wsave(item);
		self.change(true);
		meta.resizeforce();
	};

	var wsavecallback = function(item) {
		var key = 'win_' + item.meta.cachekey;
		var obj = {};
		obj.x = item.x;
		obj.y = item.y;
		obj.width = item.width;
		obj.height = item.height;
		obj.ww = WW;
		obj.wh = WH;
		obj.hidden = item.meta.hidden;
		PREF.set(key, obj, '1 month');
	};

	self.wsave = function(obj) {
		setTimeout2(self.ID + '_win_' + obj.meta.cachekey, wsavecallback, 500, null, obj);
	};

	self.add = function(item) {

		var hidden = '';
		var ishidden = false;

		item.cachekey = 'windowed_' + item.id;
		item.minwidth = 400;
		item.minheight = 300;

		if (item.width > WW)
			item.width = WW - 40;

		if (item.height > WH)
			item.height = WH - 120;

		item.defwidth = item.width;
		item.defheight = item.height;

		if (item.cachekey)
			item.cachekey += '' + (item.width || 800) + 'x' + (item.height || 500);

		var pos = PREF['win_' + item.cachekey];
		if (pos) {

			var mx = 0;
			var my = 0;
			var plus = 0;

			if (config.reoffsetresize && pos.ww != null && pos.wh != null) {
				mx = pos.ww - WW;
				my = pos.wh - WH;
			}

			item.x = (pos.x - mx) + plus;
			item.y = (pos.y - my) + plus;
			item.width = pos.width;
			item.height = pos.height;

		} else {
			item.x = ((WW / 2) - (item.width / 2)) >> 0;
			item.y = ((WH / 2) - (item.height / 2)) >> 0;
		}

		if (!ishidden)
			ishidden = item.hidden;

		hidden = ishidden ? ' hidden' : '';

		var el = $('<div class="{0}-item{2}" data-id="{id}" style="left:{x}px;top:{y}px;width:{width}px"><span class="{0}-resize {0}-resize-tl"></span><span class="{0}-resize {0}-resize-tr"></span><span class="{0}-resize {0}-resize-bl"></span><span class="{0}-resize {0}-resize-br"></span><div class="{0}-title"><i class="fa fa-times {0}-control" data-name="close"></i><i class="far fa-window-maximize {0}-control" data-name="maximize"></i><i class="far fa-window-minimize {0}-control" data-name="minimize"></i><i class="{1} {0}-control {0}-lastbutton" data-name="menu"></i><span>{{ title }}</span></div><div class="{0}-body" style="height:{height}px"></div></div>'.format(cls, config.menuicon, hidden).arg(item).arg(item));
		var body = el.find(cls2 + '-body');
		var pos;

		body[0].appendChild(item.window[0]);

		if (!item.resize)
			el.aclass(cls + '-noresize ' + cls + '-nomaximize');

		el.aclass(cls + '-nominimize');

		var span = el.find(cls2 + '-title').find('span');
		span.html('<i class="{0}"></i> {1}'.format(FUNC.icon(item.icon), span.text()));

		var obj = cache[item.id] = {};
		obj.main = self;
		obj.meta = item;
		obj.element = body;
		obj.container = el;
		obj.x = item.x || 200;
		obj.y = item.y || 200;
		obj.width = item.width;
		obj.height = item.height;
		item.mywindow = obj;

		if (item.buttons) {
			var builder = [];
			for (var i = 0; i < item.buttons.length; i++) {
				var btn = item.buttons[i];
				var icon = btn.icon.indexOf(' ') === -1 ? ('fa fa-' + btn.icon) : btn.icon;
				builder.push('<i class="fa fa-{1} {0}-control" data-name="{2}"></i>'.format(cls, icon, btn.name));
			}
			builder.length && el.find(cls2 + '-lastbutton').before(builder.join(''));
		}

		item.make && item.make.call(cache[item.id], body);

		obj.emitresize = function() {
			obj.ert = null;
			obj.element.SETTER('*/resize');
		};

		obj.setsize = function(w, h) {
			var t = this;
			var obj = {};

			if (w) {
				obj.width = t.width = t.meta.width = w;
				t.element.parent().css('width', w);
			}

			if (h) {
				t.element.css('height', h);
				t.height = t.meta.height = h;
			}

			t.ert && clearTimeout(t.ert);
			t.ert = setTimeout(t.emitresize, 100);
			self.wsave(t);
		};

		obj.setcommand = function(type) {

			var el = obj.element.parent();
			var c;

			switch (type) {

				case 'toggle':
					obj.setcommand(obj.meta.hidden ? 'show' : 'hide');
					break;

				case 'show':
					resetcounter = 0;
					if (obj.meta.hidden) {
						obj.meta.hidden = false;
						obj.element.parent().rclass('hidden');
						self.wsave(obj);
						self.resize2();
					}
					break;

				case 'close':
				case 'hide':
					resetcounter = 0;
					EXEC('openplatform/close', obj.meta.id);
					break;

				case 'maximize':
					c = cls + '-maximized';

					if (!el.hclass(c)) {
						obj.prevwidth = obj.width;
						obj.prevheight = obj.height;
						obj.prevx = obj.x;
						obj.prevy = obj.y;
						el.aclass(c);
						obj.setcommand('resetminimize');
					}

					var ww = (self.element.width() || WW) - config.marginleft - config.marginright;
					var wh = (self.element.height() || WH) - config.margintop - config.marginbottom;
					obj.setoffset(config.marginleft, config.margintop);
					obj.setsize(ww, wh - obj.element.position().top);
					obj.meta.resizeforce();
					break;

				case 'reset':

					if (obj.meta.resize)
						obj.setsize(obj.meta.defwidth, obj.meta.defheight);

					var x = ((WW / 2) - (obj.meta.defwidth / 2)) >> 0;
					var y = ((WH / 2) - (obj.meta.defheight / 2)) >> 0;

					obj.setoffset(x + resetcounter, y + resetcounter);
					el.rclass(cls + '-maximized');
					obj.meta.resizeforce();
					resetcounter += 30;
					break;

				case 'resetmaximize':
					c = cls + '-maximized';
					if (el.hclass(c)) {
						obj.setoffset(obj.prevx, obj.prevy);
						obj.setsize(obj.prevwidth, obj.prevheight);
						el.rclass(c);
						obj.meta.resizeforce();
					}
					resetcounter = 0;
					break;

				case 'togglemaximize':
					resetcounter = 0;
					c = cls + '-maximized';
					obj.setcommand(el.hclass(c) ? 'resetmaximize' : 'maximize');
					break;

				case 'minimize':
					resetcounter = 0;
					c = cls + '-minimized';
					if (!el.hclass(c))
						el.aclass(c);
					break;

				case 'resetminimize':
					resetcounter = 0;
					c = cls + '-minimized';
					el.hclass(c) && el.rclass(c);
					break;

				case 'toggleminimize':
					resetcounter = 0;
					c = cls + '-minimized';
					obj.setcommand(el.hclass(c) ? 'resetminimize' : 'minimize');
					break;

				case 'resize':
					resetcounter = 0;
					obj.setsize(obj.width, obj.height);
					break;

				case 'move':
					resetcounter = 0;
					obj.setoffset(obj.x, obj.y);
					break;

				case 'focus':
					resetcounter = 0;
					obj.setcommand('resetminimize');
					prevfocused && prevfocused.rclass(cls + '-focused');
					prevfocused = obj.element.parent().aclass(cls + '-focused');
					break;
				default:
					if (obj.meta.buttons) {
						var btn = obj.meta.buttons.findItem('name', type);
						if (btn && btn.exec)
							btn.exec.call(obj, obj);
					}
					break;
			}
		};

		obj.setoffset = function(x, y) {
			var t = this;
			var obj = {};

			if (x != null)
				obj.left = t.x = t.meta.x = x;

			if (y != null)
				obj.top = t.y = t.meta.y = y;

			t.element.parent().css(obj);
			self.wsave(t);
		};

		self.append(el);

		setTimeout(function(obj) {
			obj.setcommand('focus');
		}, 100, obj);

		return obj;
	};

	self.rem = function(item) {
		var obj = cache[item.id];
		if (obj) {
			var main = obj.element.closest(cls2 + '-item');
			main.off('*');
			main.find('*').off('*');
			main.remove();
			delete cache[item.id];
		}
	};

	self.toggle = function(id) {
		var item = cache[id];
		item && item.setcommand('toggle');
	};

	self.show = function(id) {
		var item = cache[id];
		item && item.setcommand('show');
	};

	self.focus = function(id) {
		var item = cache[id];
		item && item.setcommand('focus');
	};

	self.hide = function(id) {
		var item = cache[id];
		item && item.setcommand('hide');
	};

});
// End: j-Windowed

// Component: j-SearchInput
// Version: 1
// Updated: 2020-12-19 11:18
COMPONENT('searchinput','searchicon:fa fa-search;cancelicon:fa fa-times;align:left',function(self,config,cls){var input,icon,prev;self.novalidate();self.make=function(){self.aclass(cls+' '+cls+'-'+config.align);self.html('<span><i class="{0}"></i></span><div><input type="text" autocomplete="new-password" maxlength="100" placeholder="{1}" data-jc-bind /></div>'.format(config.searchicon,config.placeholder));input=self.find('input')[0];icon=self.find('i');self.event('click','span',function(){prev&&self.set('')});if(config.autofocus&&!isMOBILE){setTimeout(function(){input.focus()},config.autofocus==true?500:config.autofocus)}};self.focus=function(){input&&input.focus()};self.check=function(){var is=!!input.value.trim();if(is!==prev){icon.rclass().aclass(is?config.cancelicon:config.searchicon);prev=is;self.tclass(cls+'-is',is)}};self.clear=function(){input.value='';config.exec&&self.SEEX(config.exec,input.value);self.check()};self.setter=function(value){input.value=value||'';config.exec&&self.SEEX(config.exec,input.value);self.check()}});
// End: j-SearchInput

