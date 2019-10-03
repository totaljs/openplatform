COMPONENT('permissionsop', 'placeholder:Search;types:CRUD;default:R;labelrole:Role;labelgroup:Group;pk:id', function(self, config) {

	var cls = 'ui-permissions';
	var cls2 = '.' + cls;
	var tbody;
	var skip = false;
	var items = [];
	var types = config.types.split('').trim();

	self.configure = function(key, value) {
		switch (key) {
			case 'disabled':
				self.tclass(cls + '-disabled', value);
				break;
		}
	};

	self.make = function() {
		self.aclass(cls);
		config.disabled && self.aclass(cls + '-disabled');

		var builder = ['<tr data-index="{{ index }}"><td class="{0}-text"><i class="fa fa-times red"></i>{{ text | raw }}</td>'];

		for (var i = 0; i < types.length; i++)
			builder.push('<td class="{0}-type{{ if value.indexOf(\'{1}\') !== -1 }} {0}-checked{{ fi }}" data-type="{1}"><i class="far"></i>{1}</td>'.format(cls, types[i]));

		builder.push('</tr>');
		self.template = Tangular.compile(builder.join('').format(cls));
		self.html('<div class="{0}-header"><i class="fa fa-plus-circle green"></i><span>{1}</span></div><div class="{0}-container"><table><tbody></tbody></table></div>'.format(cls, self.html()));
		tbody = self.find('tbody');

		self.event('click', cls2 + '-header', function() {

			if (config.disabled)
				return;

			if (config.limit && items.length >= config.limit) {
				if (W.OP)
					OP.message(config.limitmessage, 'warning');
				else
					SETTER('message', 'warning', config.limitmessage);
				return;
			}

			var opt = {};
			opt.raw = true;
			opt.element = $(this);
			opt.placeholder = config.placeholder;
			opt.items = function(search, next) {
				AJAX('GET ' + config.find, { q: search }, function(response) {
					next(self.preparedata(response));
				});
			};

			opt.key = config.dirkey || 'name';
			opt.callback = function(value) {
				if (items.findItem(config.pk, value[config.pk]))
					return;
				if (!items.length)
					tbody.empty();
				value.value = config.default;
				tbody.append(self.binditem(items.length, value));
				items.push(value);
				self.serialize();
			};
			SETTER('directory', 'show', opt);
		});

		self.event('click', cls2 + '-type', function() {
			if (config.disabled)
				return;
			var el = $(this);
			var tr = el.closest('tr');
			el.tclass(cls + '-checked');
			skip = true;
			var index = +tr.attrd('index');
			var type = el.attrd('type');
			if (el.hclass(cls + '-checked'))
				items[index].value += type;
			else
				items[index].value = items[index].value.replace(type, '');
			self.serialize();
		});

		self.event('click', '.fa-times', function() {
			if (config.disabled)
				return;
			var el = $(this);
			var tr = el.closest('tr');
			var index = +tr.attrd('index');
			skip = true;
			items.splice(index, 1);
			self.serialize();
			tr.remove();
			self.find('tr').each(function(index) {
				$(this).attrd('index', index);
			});
			if (!items.length)
				self.setter(EMPTYARRAY);
		});
	};

	self.preparedata = function(data) {
		var arr = self.get();
		for (var i = 0; i < data.length; i++) {
			var item = data[i];
			if (item.prepared)
				continue;

			item.prepared = true;
			item.value = '';

			if (arr) {
				for (var j = 0; j < arr.length; j++) {
					if (arr[j].substring(1) === item[config.pk])
						item.value += arr[j].charAt(0);
				}
			}

			switch (item[config.pk].charAt(0)) {
				case '@':
					item.name = '<b>' + config.labelrole + '</b> ' + item.name;
					break;
				case '#':
					item.name = '<b>' + config.labelgroup + '</b> ' + item.name;
					break;
				default:
					item.name = Thelpers.encode(item.name);
					break;
			}
		}
		return data;
	};

	self.serialize = function() {
		var data = [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var types = item.value.split('');
			for (var j = 0; j < types.length; j++)
				data.push(types[j] + item[config.pk]);
		}
		skip = true;
		self.change();
		self.set(data);
	};

	self.binditem = function(index, item) {
		return self.template({ index: index, text: item.text || item.name, value: item.value || types[0] || 'R' });
	};

	self.bindhtml = function(value) {
		items = self.preparedata(value);
		var builder = [];
		for (var i = 0; i < value.length; i++) {
			var item = value[i];
			builder.push(self.binditem(i, item));
		}
		tbody.html(builder.join(''));
	};

	self.setter = function(value) {

		if ((!items || !items.length) || (!skip && (!value || !value.length))) {
			items = [];
			config.empty && tbody.html('<tr><td class="{0}-empty"><i class="fa fa-database"></i>{1}</td></tr>'.format(cls, config.empty));
			skip = false;
			return;
		}

		if (skip) {
			skip = false;
			return;
		}

		items = [];

		if (value) {
			var filter = {};

			for (var i = 0; i < value.length; i++) {
				var id = value[i].substring(1);
				filter[id] = 1;
			}

			AJAX('GET ' + config.read, { id: Object.keys(filter).join(',') }, self.bindhtml);
		}
	};

});

// Designer: Core
COMPONENT('schema', 'width:6000;height:6000;grid:25;paddingX:6;curvedlines:0;border:1;drag:.area;connectionoffset:10', function(self, config) {

	// config.infopath {String}, output: { zoom: Number, selected: Object }
	// config.undopath {String}, output: {Object Array}
	// config.redopath {String}, output: {Object Array}

	var cls = 'ui-schema';
	var drag = {};

	self.readonly();
	self.meta = {};
	self.el = {};     // elements
	self.op = {};     // operations
	self.cache = {};  // cache
	self.info = { zoom: 100 };
	self.undo = [];
	self.redo = [];

	self.make = function() {
		self.aclass(cls);
		self.template = Tangular.compile('<div class="component invisible{{ if inputs && inputs.length }} hasinputs{{ fi }}{{ if outputs && outputs.length }} hasoutputs{{ fi }}" data-id="{{ id }}" style="top:{{ y }}px;left:{{ x }}px"><div class="area">{0}</div></div>'.format(self.find('script').html()));
		self.html('<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="svg-grid" width="{grid}" height="{grid}" patternunits="userSpaceOnUse"><path d="M {grid} 0 L 0 0 0 {grid}" fill="none" class="ui-schema-grid" shape-rendering="crispEdges" /></pattern></defs><rect width="100%" height="100%" fill="url(#svg-grid)" shape-rendering="crispEdges" /><g class="lines"></g></svg>'.arg(config));
		self.el.svg = self.find('svg');
		self.el.lines = self.el.svg.find('g.lines');

		drag.touchmove = function(e) {
			var evt = e.touches[0];
			drag.lastX = evt.pageX;
			drag.lastY = evt.pageY;
		};

		drag.touchend = function(e) {
			e.target = document.elementFromPoint(drag.lastX, drag.lastY);

			if (e.target && e.target.tagName !== 'SVG')
				e.target = $(e.target).closest('svg')[0];

			drag.unbind();

			if (e.target) {
				var pos = self.op.position();
				e.pageX = drag.lastX;
				e.pageY = drag.lastY;
				e.offsetX = e.pageX - pos.left;
				e.offsetY = e.pageY - pos.top;
				drag.drop(e);
			}
		};

		drag.bind = function() {
			$(document).on('touchmove', drag.touchmove);
			$(document).on('touchend', drag.touchend);
		};

		drag.unbind = function() {
			$(document).off('touchmove', drag.touchmove);
			$(document).off('touchend', drag.touchend);
		};

		drag.handler = function(e) {

			drag.el = $(e.target);

			if (e.touches)
				drag.bind();

			if (e.originalEvent.dataTransfer)
				e.originalEvent.dataTransfer.setData('text', '1');
		};

		drag.drop = function(e) {
			var meta = {};
			meta.pageX = e.pageX;
			meta.pageY = e.pageY;
			meta.offsetX = e.offsetX;
			meta.offsetY = e.offsetY;
			meta.el = drag.el;
			meta.target = $(e.target);
			config.ondrop && EXEC(config.ondrop, meta, self);
		};

		$(document).on('dragstart', '[draggable]', drag.handler);
		$(document).on('touchstart', '[draggable]', drag.handler);

		self.el.svg.on('dragenter dragover dragexit drop dragleave', function(e) {
			switch (e.type) {
				case 'drop':
					drag.drop(e);
					break;
			}
			e.preventDefault();
		});
	};

	self.destroy = function() {
		$(document).off('dragstart', drag.handler);
	};

	self.getOffset = function() {
		return self.element.offset();
	};

	self.setter = function(value, path, type) {

		if (type === 2)
			return;

		var keys = Object.keys(value);
		var onmake = config.onmake ? GET(config.onmake) : null;
		var ondone = config.ondone ? GET(config.ondone) : null;
		var onremove = config.onremove ? GET(config.onremove) : null;
		var prev = self.cache;
		var ischanged = false;
		var tmp;
		var el;
		var posX = 0;
		var posY = 0;

		var area = self.closest('.ui-scrollbar-area');
		if (area.length) {
			posX += (area[0].scrollLeft + (area.width() / 2) >> 0) - 300;
			posY += (area[0].scrollTop + (area.height() / 2) >> 0) - 150;
		}

		self.cache = {};

		for (var i = 0; i < keys.length; i++) {

			var key = keys[i];
			var com = value[key];
			var checksum = self.helpers.checksum(com);

			if (!com.x && com.x != 0) {
				com.x = posX;
				com.y = posY;
				posX += 300;
				posY += 300;
			}

			// com.id = key
			// com.connections = [{ ID: COMPONENT_ID }];
			// com.x
			// com.y
			// com.actions = { select: true, move: true, disabled: false, remove: true, connet: true };

			// Delegates
			// com.onmake = function(el, com)
			// com.ondone = function(el, com)
			// com.onmove = function(el, com)
			// com.onremove = function(el, com)
			// com.onconnect = function(meta)
			// com.ondisconnect = function(meta)

			// done && done(el, com);
			// make && make(el, com);

			var tmp = prev[key];
			var rebuild = true;

			com.id = key;

			if (tmp) {
				if (tmp.checksum === checksum)
					rebuild = false;
				delete prev[key];
				el = tmp.el;
			}

			if (rebuild) {
				tmp && tmp.el.aclass('removed').attrd('id', 'removed');
				var html = self.template(com);
				self.append(html);
				el = self.find('.component[data-id="{id}"]'.arg(com));
				com.onmake && com.onmake(el, com);
				onmake && onmake(el, com);
				if (!ischanged && com.connections && com.connections.length)
					ischanged = true;
				if (type === 1)
					self.op.undo({ type: 'component', id: com.id, instance: com });
			}

			if (!com.connections)
				com.connections = [];

			self.cache[key] = { id: key, instance: com, el: el, checksum: checksum, actions: com.actions || {}};
		}

		// Remove unused components
		keys = Object.keys(prev);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			tmp = prev[key];
			tmp.instance.onremove && tmp.instance.onremove(tmp.el, tmp.instance);
			onremove && onremove(tmp.el, tmp.instance);
			tmp.el.remove();
		}

		keys = Object.keys(self.cache);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			tmp = self.cache[key];
			tmp.instance.ondone && tmp.instance.ondone(tmp.el, tmp.instance);
			ondone && ondone(tmp.el, tmp.instance);
		}

		ischanged && self.el.lines.find('path').rclass().aclass('connection removed');
		setTimeout(function() {
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				tmp = self.cache[key];
				tmp.el.rclass('invisible');
				ischanged && tmp.instance.connections && self.reconnect(tmp);
			}
			self.find('.removed').remove();
		}, 500);

		self.op.refreshinfo();
	};

	self.reconnect = function(m) {
		var connections = m.instance.connections;
		for (var i = 0; i < connections.length; i++) {
			var conn = connections[i];
			var target = self.find('.component[data-id="{0}"]'.format(conn.id));
			self.el.connect(m.el, target, true);
		}
	};

	self.selected = function(callback) {

		var output = {};
		var arr;
		var tmp;
		var el;

		output.components = [];
		output.connections = [];

		arr = self.find('.component-selected');
		for (var i = 0; i < arr.length; i++) {
			el = arr[i];
			tmp = self.cache[el.getAttribute('data-id')];
			tmp && output.components.push(tmp);
		}

		arr = self.find('.connection-selected');
		for (var i = 0; i < arr.length; i++) {

			el = arr[i];
			var cls = el.getAttribute('class').split(' ');
			for (var j = 0; j < cls.length; j++) {
				var c = cls[j];
				if (c.substring(0, 5) === 'conn_') {
					var a = c.split('_');
					var tmp = {};
					tmp.output = self.cache[a[1]].instance;
					tmp.input = self.cache[a[2]].instance;
					tmp.fromid = a[1];
					tmp.toid = a[2];
					output.connections.push(tmp);
				}
			}
		}

		callback && callback(output);
		return output;
	};
});

// Designer: Helpers
EXTENSION('schema:helpers', function(self, config) {

	var skip = {};
	skip.x = 1;
	skip.y = 1;
	skip.connections = 1;
	skip.id = 1;
	skip.actions = 1;

	self.helpers = {};

	self.helpers.checksum = function(obj) {
		var keys = Object.keys(obj);
		var sum = {};
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			if (!skip[key])
				sum[key] = obj[key];
		}
		return HASH(sum, true);
	};

	self.helpers.connect = function(x1, y1, x4, y4) {

		var index = 0;
		var y = (y4 - y1) / ((index || 0) + 2);
		var x2 = x1;
		var y2 = y1 + y;
		var x3 = x4;
		var y3 = y1 + y;
		var s = ' ';

		if (config.curvedlines)
			return self.helpers.diagonal(x1, y1, x4, y4);

		var builder = [];

		builder.push('M' + (x1 >> 0) + s + (y1 >> 0));

		if (x1 !== x4 && y1 !== y4) {
			builder.push('L' + (x2 >> 0) + s + (y2 >> 0));
			builder.push('L' + (x3 >> 0) + s + (y3 >> 0));
		}

		if (!config.curvedlines)
			builder.push('L' + (x4 >> 0) + s + (y4 >> 0));

		return builder.join(s);
	};

	self.helpers.move1 = function(x1, y1, conn) {
		var pos = conn.attrd('offset').split(',');
		conn.attr('d', self.helpers.connect(x1, y1, +pos[2], +pos[3]));
		conn.attrd('offset', x1 + ',' + y1 + ',' + pos[2] + ',' + pos[3]);
	};

	self.helpers.checkconnected = function(meta) {
		meta.el.tclass('connected', Object.keys(meta.instance.connections).length > 0);
	};

	self.helpers.checkconnectedoutput = function(id) {
		var is = !!self.el.lines.find('.from_' + id).length;
		self.find('.component[data-id="{0}"]'.format(id)).tclass('connected', is);
	};

	self.helpers.checkconnectedinput = function(id) {
		var is = !!self.el.lines.find('.to_' + id).length;
		self.find('.component[data-id="{0}"]'.format(id)).tclass('connected', is);
	};

	self.helpers.move2 = function(x4, y4, conn) {
		var pos = conn.attrd('offset').split(',');
		conn.attr('d', self.helpers.connect(+pos[0], +pos[1], x4, y4));
		conn.attrd('offset', pos[0] + ',' + pos[1] + ',' + x4 + ',' + y4);
	};

	self.helpers.isconnected = function(output, input) {

		var co = output.closest('.component');
		var ci = input.closest('.component');
		var coid = self.cache[co.attrd('id')];
		var ciid = self.cache[ci.attrd('id')];

		if (coid.actions.disabled || coid.actions.connect === false || ciid.actions.disabled || ciid.actions.connect === false)
			return true;

		var el = $('.conn_' + co.attrd('id') + '_' + ci.attrd('id'));
		return el.length > 0;
	};

	self.helpers.position = function(el) {

		var component = el;
		var pos = el.offset();
		var mainoffset = el.closest('.ui-schema').offset();

		var x = (pos.left - mainoffset.left) + config.border;
		var y = (pos.top - mainoffset.top) + config.border;

		return { x: x >> 0, y: y >> 0, id: component.attrd('id'), width: el.width(), height: el.height() };
	};

	self.helpers.parseconnection = function(line) {
		var arr = line.attr('class').split(' ');
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].substring(0, 5) === 'conn_') {
				var info = arr[i].split('_');
				var obj = {};
				obj.fromid = info[1];
				obj.toid = info[2];
				return obj;
			}
		}
	};

	self.helpers.diagonal = function(x1, y1, x4, y4) {
		return 'M' + x1 + ',' + y1 + 'C' + x1 +  ',' + (y1 + y4) / 2 + ' ' + x4 + ',' + (y1 + y4) / 2 + ' ' + x4 + ',' + y4;
	};

});

EXTENSION('schema:operations', function(self, config) {

	// Internal method
	var removeconnections = function(next, removed) {

		var connections = next.instance.connections;
		var meta = {};
		var onremove = function(conn) {
			var is = conn.id === removed.id;
			if (is) {
				meta.output = next.instance;
				meta.input = removed.instance;
				meta.fromid = next.id;
				meta.toid = removed.id;
				next.instance.ondisconnect && next.instance.ondisconnect.call(next.instance, meta);
				removed.instance.ondisconnect && removed.instance.ondisconnect.call(removed.instance, meta);
				config.ondisconnect && EXEC(config.ondisconnect, meta);
			}

			return is;
		};

		next.instance.connections = connections.remove(onremove);
		if (next.instance.connections.length === 0)
			self.helpers.checkconnectedoutput(next.id);

		self.helpers.checkconnected(next);
	};

	self.op.unselect = function(type) {
		var cls = 'connection-selected';
		if (type == null || type === 'connections') {
			self.el.lines.find('.' + cls).rclass(cls);
			self.el.lines.find('.highlight').rclass('highlight');
		}

		cls = 'component-selected';

		if (type == null || type === 'component')
			self.find('.' + cls).rclass(cls);

		if (self.info.selected) {
			self.info.selected = null;
			self.op.refreshinfo();
		}

	};

	self.op.modified = function() {
		self.change(true);
		self.update(true, 2);
	};

	self.op.remove = function(id, noundo) {

		var tmp = self.cache[id];
		if (tmp == null || tmp.actions.remove === false)
			return false;

		tmp.instance.onremove && tmp.instance.onremove(tmp.el, tmp.instance);
		config.onremove && EXEC(config.onremove, tmp.el, tmp.instance);

		delete self.cache[id];
		delete self.get()[id];

		self.el.lines.find('.from_' + id).remove();
		self.el.lines.find('.to_' + id).remove();

		// browse all components and find dependencies to this component
		var keys = Object.keys(self.cache);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			removeconnections(self.cache[key], tmp);
		}

		var connections = tmp.instance.connections;

		for (var i = 0; i < connections.length; i++) {
			var conn = connections[i];
			self.helpers.checkconnectedinput(conn.id);
		}

		if (!noundo)
			self.op.undo({ type: 'remove', id: id, instance: tmp.instance });

		self.find('.component[data-id="{0}"]'.format(id)).remove();
		self.op.modified();
		return true;
	};

	self.op.select = function(id) {

		var com = self.cache[id];
		if (com == null)
			return false;

		var cls = 'component-selected';
		self.find('.' + cls).rclass(cls);
		self.find('.component[data-id="{0}"]'.format(id)).aclass(cls);
		self.info.selected = com.instance;
		self.op.refreshinfo();

		var connections = self.el.lines.find('.from_{0},.to_{0}'.format(id)).aclass('highlight');
		var parent = self.el.lines[0];

		for (var i = 0; i < connections.length; i++) {
			var dom = connections[i];
			parent.removeChild(dom);
			parent.appendChild(dom);
		}

		return true;
	};

	self.op.disconnect = function(fromid, toid, noundo) {

		if (typeof(fromid) === 'object') {
			var meta = fromid;
			toid = meta.toid;
			fromid = meta.fromid;
		}

		var a = self.cache[fromid];
		var b = self.cache[toid];

		if (!a || !b)
			return false;

		var ac = a.instance;

		var conn = ac.connections.findItem('id', toid);
		if (!conn || conn.disabled)
			return false;

		ac.connections.splice(ac.connections.indexOf(conn));

		if (!noundo)
			self.op.undo({ type: 'disconnect', fromid: fromid, toid: toid });

		self.el.lines.find('.conn_{0}_{1}'.format(fromid, toid)).remove();
		self.op.modified();
		self.helpers.checkconnected(a);
		self.helpers.checkconnectedoutput(fromid);
		self.helpers.checkconnectedinput(toid);
		return true;
	};

	self.op.reposition = function() {
		self.el.lines.find('.connection').each(function() {

			var path = $(this);
			var meta = self.helpers.parseconnection(path);
			var output = self.find('.component[data-id="{0}"]'.format(meta.fromid));
			var input = self.find('.component[data-id="{0}"]'.format(meta.toid));
			var a = self.helpers.position(output);
			var b = self.helpers.position(input);

			// I don't know why :-D
			b.x -= config.paddingX;

			path.attrd('offset', a.x + ',' + a.y + ',' + b.x + ',' + b.y);
			path.attr('d', self.helpers.connect(a.x, a.y, b.x, b.y));
		});
	};

	self.op.position = function() {
		var obj = {};
		var scroll = self.closest('.ui-scrollbar-area')[0];

		if (scroll) {
			obj.scrollTop = scroll.scrollTop;
			obj.scrollLeft = scroll.scrollLeft;
		}

		var offset = self.el.svg.offset();
		obj.left = offset.left;
		obj.top = offset.top;
		return obj;
	};

	self.op.refreshinfo = function() {
		config.infopath && SEEX(config.infopath, self.info);
	};

	self.op.undo = function(value) {
		if (value) {
			self.undo.push(value);
			if (self.undo.length > 50)
				self.undo.shift();
		}
		config.undopath && SEEX(config.undopath, self.undo);
	};

	self.op.redo = function(value) {
		if (value) {
			self.redo.push(value);
			if (self.redo.length > 50)
				self.redo.shift();
		}
		config.redopath && SEEX(config.redopath, self.redo);
	};

});

EXTENSION('schema:map', function(self, config) {

	var events = {};
	var drag = {};

	events.move = function(e) {
		var x = (drag.x - e.pageX);
		var y = (drag.y - e.pageY);

		if (drag.target[0]) {
			drag.target[0].scrollTop +=  ((y / 6) / drag.zoom) >> 0;
			drag.target[0].scrollLeft += ((x / 6) / drag.zoom) >> 0;
		}
	};

	events.movetouch = function(e) {
		events.move(e.touches[0]);
	};

	events.up = function() {
		events.unbind();
	};

	events.bind = function() {
		self.element.on('mouseup', events.up);
		self.element.on('mousemove', events.move);
		self.element.on('touchend', events.up);
		self.element.on('touchmove', events.movetouch);
	};

	events.unbind = function() {
		self.element.off('mouseup', events.up);
		self.element.off('mousemove', events.move);
		self.element.off('touchend', events.up);
		self.element.off('touchmove', events.movetouch);
	};

	self.event('mousedown touchstart', function(e) {

		if (e.target.tagName !== 'rect')
			return;

		var evt = e.touches ? e.touches[0] : e;
		var et = $(e.target);
		var target = et.closest('.ui-scrollbar-area');

		if (!target[0]) {
			target = et.closest('.ui-viewbox');
			if (!target[0])
				return;
		}

		drag.target = target;
		drag.zoom = self.info.zoom / 100;
		drag.x = evt.pageX;
		drag.y = evt.pageY;

		events.bind();
		e.preventDefault();

		// Unselects all selected components/connections
		self.op.unselect();
		config.onselect && EXEC(config.onselect, null);
	});
});

EXTENSION('schema:components', function(self, config) {

	var events = {};
	var drag = {};

	var zoom = function(val) {
		return Math.ceil(val / drag.zoom) - drag.zoomoffset;
	};

	drag.css = {};

	events.move = function(e) {

		var x = (e.pageX - drag.x);
		var y = (e.pageY - drag.y);

		drag.css.left = zoom(drag.posX + x);
		drag.css.top = zoom(drag.posY + y);

		if (!drag.is)
			drag.is = true;

		drag.target.css(drag.css);

		// move all output connections
		var arr = self.el.lines.find('.from_' + drag.id);
		for (var j = 0; j < arr.length; j++) {
			var com = self.cache[drag.id];
			self.helpers.move1(drag.css.left + com.el.width() - config.connectionoffset, drag.css.top + zoom(config.border) + com.el.height(), $(arr[j]));
		}

		// move all input connections
		arr = self.el.lines.find('.to_' + drag.id);
		for (var j = 0; j < arr.length; j++)
			self.helpers.move2(drag.css.left + drag.zoomoffset + config.connectionoffset, drag.css.top + zoom(config.border + 1), $(arr[j]));
	};

	events.movetouch = function(e) {
		events.move(e.touches[0]);
	};

	events.up = function() {

		if (drag.is) {
			var data = self.get()[drag.id];
			self.op.undo({ type: 'move', id: drag.id, x: data.x, y: data.y, newx: drag.css.left, newy: drag.css.top });
			data.x = drag.css.left;
			data.y = drag.css.top;
			data.onmove && data.onmove(drag.target, data);
			config.onmove && EXEC(config.onmove, drag.target, data);
			self.op.modified();
		}

		events.unbind();
	};

	events.bind = function() {
		self.element.on('mouseup', events.up);
		self.element.on('mousemove', events.move);
		self.element.on('touchend', events.up);
		self.element.on('touchmove', events.movetouch);
	};

	events.unbind = function() {
		self.element.off('mouseup', events.up);
		self.element.off('mousemove', events.move);
		self.element.off('touchend', events.up);
		self.element.off('touchmove', events.movetouch);
	};

	self.event('mousedown touchstart', '.component', function(e) {

		e.preventDefault();

		var evt = e.touches ? e.touches[0] : e;
		var target = $(this);
		var el = $(e.target);
		var candrag = false;

		if (el.is(config.drag) || el.closest(config.drag).length)
			candrag = true;

		// config.drag
		drag.id = target.attrd('id');

		var tmp = self.cache[drag.id];

		self.op.unselect('connections');

		if (tmp.actions.select !== false)
			self.op.select(drag.id);

		if (!candrag || tmp.actions.move === false)
			return;

		drag.target = target;
		drag.x = evt.pageX;
		drag.y = evt.pageY;
		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) + (self.info.zoom > 100 ? 1 : -1);
		drag.height = target.height();

		drag.is = false;
		var pos = target.position();
		drag.posX = pos.left;
		drag.posY = pos.top;

		config.onselect && EXEC(config.onselect, self.cache[drag.id]);
		events.bind();
	});

});

EXTENSION('schema:connections', function(self, config) {

	var events = {};
	var drag = {};
	var prevselected = null;

	drag.css = {};

	var zoom = function(val) {
		return Math.ceil(val / drag.zoom) - drag.zoomoffset;
	};

	events.move = function(e) {
		var x = (e.pageX - drag.x) + drag.offsetX;
		var y = (e.pageY - drag.y) + drag.offsetY;
		drag.path.attr('d', self.helpers.connect(zoom(drag.pos.x),zoom(drag.pos.y), zoom(x), zoom(y)));
	};

	events.movetouch = function(e) {
		var evt = e.touches[0];
		drag.lastX = evt.pageX;
		drag.lastY = evt.pageY;
		events.move(evt);
	};

	events.up = function(e) {

		drag.path.remove();
		events.unbind();

		if (drag.lastX != null && drag.lastY != null)
			e.target= document.elementFromPoint(drag.lastX, drag.lastY);

		drag.target.add(drag.targetcomponent).rclass('connecting');

		if (drag.input) {

			// DRAGGED FROM INPUT
			var output = $(e.target).closest('.output');
			if (!output.length)
				return;

			// Checks if the connection is existing
			if (self.helpers.isconnected(output, drag.target))
				return;

			self.el.connect(output, drag.target);

		} else {

			// DRAGGED FROM OUTPUT
			var input = $(e.target).closest('.input');
			if (!input.length)
				return;

			// Checks if the connection is existing
			if (self.helpers.isconnected(drag.target, input))
				return;

			self.el.connect(drag.target, input);
		}
	};

	events.bind = function() {
		self.element.on('mouseup', events.up);
		self.element.on('mousemove', events.move);
		self.element.on('touchend', events.up);
		self.element.on('touchmove', events.movetouch);
	};

	events.unbind = function() {
		self.element.off('mouseup', events.up);
		self.element.off('mousemove', events.move);
		self.element.off('touchend', events.up);
		self.element.off('touchmove', events.movetouch);
	};

	self.event('mousedown touchstart', '.output,.input', function(e) {

		e.preventDefault();
		e.stopPropagation();

		var target = $(this);
		var evt = e.touches ? e.touches[0] : e;
		var com = target.closest('.component');
		var tmp = self.cache[com.attrd('id')];

		if (tmp.actions.disabled || tmp.actions.connect === false)
			return;

		var offset = self.getOffset();
		var targetoffset = target.offset();

		drag.input = target.hclass('input');
		drag.target = target;
		drag.x = evt.pageX;
		drag.y = evt.pageY;
		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) + (self.info.zoom > 100 ? 1 : -1);

		drag.pos = self.helpers.position(target);
		drag.target.add(com).aclass('connecting');
		drag.targetcomponent = com;

		// For touch devices
		drag.lastX = null;
		drag.lastY = null;

		if (drag.input)
			drag.pos.x -= config.paddingX;

		if (evt.offsetX == null || evt.offsetY == null) {
			var off = self.op.position();
			drag.offsetX = drag.x - off.left;
			drag.offsetY = drag.y - off.top;
		} else {
			drag.offsetX = (targetoffset.left - offset.left) + evt.offsetX + (drag.input ? 0 : 5);
			drag.offsetY = (targetoffset.top - offset.top) + evt.offsetY + (drag.input ? 0 : 2);
		}

		drag.path = self.el.lines.asvg('path');
		drag.path.aclass('connection connection-draft');

		events.bind();
	});

	self.el.connect = function(output, input, init) {

		var a = self.helpers.position(output);
		var b = self.helpers.position(input);

		a.x += a.width - config.connectionoffset;

		// a.x += a.width / 2 >> 0;
		// a.y += a.height / 2 >> 0;
		// b.x += b.width / 2 >> 0;
		// b.y += b.height / 2 >> 0;

		a.y += output.height();
		b.x += config.connectionoffset;

		drag.zoom = self.info.zoom / 100;
		drag.zoomoffset = ((100 - self.info.zoom) / 10) - 1;

		if (drag.zoom !== 1) {
			b.x = zoom(b.x);
			b.y = zoom(b.y);
			a.x = zoom(a.x);
			a.y = zoom(a.y);
		}

		var path = self.el.lines.asvg('path');
		path.aclass('connection from_' + a.id + ' to_' + b.id + ' conn_' + a.id + '_' + b.id);
		path.attrd('offset', a.x + ',' + a.y + ',' + b.x + ',' + b.y);
		path.attr('d', self.helpers.connect(a.x, a.y, b.x, b.y));
		input.add(output).aclass('connected');

		var data = self.get();
		var ac = data[a.id];
		var bc = data[b.id];

		if (ac.connections == null)
			ac.connections = [];

		var is = true;

		if (ac.connections.findIndex('id', b.id) != -1)
			is = false;

		if (is)
			ac.connections.push({ id: b.id });

		output.closest('.component').aclass('connected');

		var meta = {};
		meta.output = ac;
		meta.input = data[b.id];
		meta.fromid = a.id;
		meta.toid = b.id;
		meta.path = path;
		ac.onconnect && ac.onconnect.call(ac, meta);
		bc.onconnect && bc.onconnect.call(bc, meta);
		config.onconnect && EXEC(config.onconnect, meta);

		if (!init) {
			self.op.undo({ type: 'connect', fromid: meta.fromid, toid: meta.toid });
			self.op.modified();
		}
	};

	self.event('mousedown touchstart', '.connection', function(e) {
		var el = $(this);
		var cls = 'connection-selected';

		self.op.unselect();

		if (el.hclass(cls))
			return;

		prevselected && prevselected.rclass(cls);
		el.aclass(cls);
		prevselected = el;

		var conn = self.helpers.parseconnection(el);

		conn.isconnection = true;
		conn.frominstance = self.cache[conn.fromid].instance;
		conn.toinstance = self.cache[conn.toid].instance;

		self.info.selected = conn;
		self.op.refreshinfo();

		var dom = el[0];
		var parent = el.parent()[0];

		parent.removeChild(dom);
		parent.appendChild(dom);

		e.preventDefault();
		e.stopPropagation();
	});

});

EXTENSION('schema:commands', function(self) {

	var zoom = 1;

	var disconnect = function() {
		var arr = self.el.lines.find('.connection-selected');
		for (var i = 0; i < arr.length; i++) {
			var obj = self.helpers.parseconnection($(arr[i]));
			obj && self.op.disconnect(obj.fromid, obj.toid);
		}
	};

	var remove = function() {
		var arr = self.find('.component-selected');
		for (var i = 0; i < arr.length; i++)
			self.op.remove($(arr[i]).attrd('id'));
	};

	self.command('schema.components.find', function(id) {
		var com = self.cache[id];
		if (com) {
			var pos = com.el.offset();
			var scroll = self.closest('.ui-scrollbar-area');
			if (scroll) {
				var offset = self.element.offset();
				scroll.animate({ scrollLeft: pos.left - 200 - offset.left, scrollTop: pos.top - 150 - offset.top }, 300);
				self.op.unselect();
				self.op.select(id);
			}
		}
	});

	self.command('schema.refresh', self.op.reposition);

	self.command('schema.selected.disconnect', function() {
		disconnect();
		self.op.unselect();
	});

	self.command('schema.selected.remove', function() {
		remove();
		self.op.unselect();
	});

	self.command('schema.selected.clear', function() {
		disconnect();
		remove();
		self.op.unselect();
	});

	self.command('schema.components.add', function(com) {
		com.id = 'D' + Date.now() + '';
		var data = self.get();
		data[com.id] = com;
		self.op.modified();
		self.refresh(true);
	});

	self.command('schema.zoom', function(type) {

		switch (type) {
			case 'in':
				zoom -= 0.05;
				break;
			case 'out':
				zoom += 0.05;
				break;
			case 'reset':
				zoom = 1;
				break;
		}

		if (zoom < 0.3 || zoom > 1.7)
			return;

		self.info.zoom = 100 * zoom;
		self.op.refreshinfo();
		self.element.css('transform', 'scale({0})'.format(zoom));
	});

	self.command('schema.undo', function() {

		var prev = self.undo.pop();
		if (prev == null)
			return;

		self.op.undo();
		self.op.redo(prev);

		if (prev.type === 'disconnect') {
			var output = self.find('.component[data-id="{0}"]'.format(prev.fromid));
			var input = self.find('.component[data-id="{0}"]'.format(prev.toid));
			self.el.connect(output, input, true);
			return;
		}

		if (prev.type === 'connect') {
			self.op.disconnect(prev.fromid, prev.toid, true);
			return;
		}

		if (prev.type === 'component') {
			self.op.remove(prev.id, true);
			return;
		}

		if (prev.type === 'move') {
			self.find('.component[data-id="{0}"]'.format(prev.id)).css({ left: prev.x, top: prev.y });
			self.op.reposition();
			return;
		}

		if (prev.type === 'remove') {
			var com = prev.instance;
			com.id = prev.id;
			var data = self.get();
			data[com.id] = com;
			self.op.modified();
			self.update('refresh');
			return;
		}

	});

	self.command('schema.redo', function() {

		var next = self.redo.pop();
		if (next == null)
			return;

		self.op.redo();
		self.op.undo(next);
		self.op.refreshinfo();

		if (next.type === 'disconnect') {
			self.op.disconnect(next.fromid, next.toid, true);
			return;
		}

		if (next.type === 'connect') {
			var output = self.find('.component[data-id="{0}"]'.format(next.fromid));
			var input = self.find('.component[data-id="{0}"]'.format(next.toid));
			self.el.connect(output, input, true);
			return;
		}

		if (next.type === 'component') {
			var com = next.instance;
			com.id = next.id;
			var data = self.get();
			data[com.id] = com;
			self.op.modified();
			self.refresh(true);
			return;
		}

		if (next.type === 'move') {
			self.find('.component[data-id="{0}"]'.format(next.id)).css({ left: next.newx, top: next.newy });
			self.op.reposition();
			return;
		}

		if (next.type === 'remove') {
			self.op.remove(next.id, true);
			return;
		}

	});

	// Resets editor
	self.command('schema.reset', function() {
		self.undo = [];
		self.redo = [];
		self.cache = {};
		self.refresh();
		self.info.selected = null;
		self.op.refreshinfo();
	});

});
