COMPONENT('wcolumns', function(self, config) {

	var cls = 'ui-' + self.name;
	var events = {};
	var drag = {};
	var container, prev, selected;
	var skip = false;

	self.bindvisible();

	self.make = function() {
		container = self.find('.w-editor-list');
		container.on('click', 'div', function() {
			var el = $(this);
			prev && prev.rclass(cls + '-selected');
			prev = el.tclass(cls + '-selected');
			var obj = {};
			obj.el = el;
			obj.label = el.find('span').text();
			obj.path = el.attrd('path');
			obj.id = el.attrd('id');
			selected = obj;
			skip = true;
			SEEX(self.makepath(config.selected), obj);
			skip = false;
			SET('workshop.rtab', 'properties', 500);
		});

		self.watch(config.selected, function(path, value) {
			if (skip || !value)
				return;
			value.el.find('span').text(value.label || '---');
			setTimeout2(self.ID, self.save, 500);
		});

		self.event('click', function(e) {
			if (!$(e.target).hclass('w-editor-col')) {
				prev && prev.rclass(cls + '-selected');
				prev = null;
				SEEX(self.makepath(config.selected), null);
				SET('workshop.rtab', 'properties', 500);
			}
		});
	};

	self.save = function() {
		var arr = container.find('.w-editor-col');
		var items = [];
		for (var i = 0; i < arr.length; i++) {
			var el = $(arr[i]);
			items.push({ id: el.attrd('id'), label: el.find('span').text(), path: el.attrd('path') });
		}
		workshop.view.list = { items: items };
		UPD('workshop.app.views');
	};

	events.ondrag = function(e) {

		if (!drag.el)
			return;

		e.stopPropagation();
		e.preventDefault();

		switch (e.type) {
			case 'drop':

				if (drag.el.hclass('w-editor-col')) {
					var a = drag.el[0];
					var b = e.target;
					var c = container[0];
					var ai = -1;
					var bi = -1;
					for (var i = 0; i < c.children.length; i++) {
						var child = c.children[i];
						if (a === child)
							ai = i;
						else if (b === child)
							bi = i;
						if (bi !== -1 && ai !== -1)
							break;
					}

					if (ai > bi)
						c.insertBefore(a, b);
					else
						c.insertBefore(a, b.nextSibling);

					self.save();
					return;
				}

				var id = drag.el.attrd('id');
				var name = drag.el.text();
				var label = drag.el.attrd('label');
				var el = $('<div data-id="{0}" data-path="{1}" draggable="true" class="w-editor-col"><div><span>{2}</span><div>{3}</div></div></div>'.format('f' + Date.now(), id, name, label))[0];
				var next = e.target;
				if (next && $(next).hclass('w-editor-col'))
					container[0].insertBefore(el, next);
				else
					container[0].appendChild(el);
				self.save();
				break;

			case 'dragenter':
			case 'dragover':
				return;
			case 'dragexit':
			case 'dragleave':
			default:
				return;
		}
	};

	events.ondown = function(e) {
		drag.el = $(this);
	};

	$(document).on('dragenter dragover dragexit drop dragleave', '.w-editor-list,.w-editor-col', events.ondrag);
	$(document).on('mousedown', '.dworkshop-field,.w-editor-col', events.ondown);

	self.destroy = function() {
		$(document).off('dragenter dragover dragexit drop dragleave', '.w-editor-list,.w-editor-col', events.ondrag);
		$(document).off('mousedown', '.dworkshop-field,.w-editor-col', events.ondown);
	};

	self.setter = function() {
		selected = null;
	};
});

COMPONENT('wsettings', 'search:Search', function(self, config) {

	var cls = 'ui-wsettings';
	var cls2 = '.' + cls;
	var template = '<div class="{0}-item {0}-item-{1}{5}" data-type="{1}" data-name="{2}"><label>{3}</label>{4}</div>';
	var Tstring = '<div class="string"><input type="text" /></div>';
	var Tfield = '<div class="field"><i class="fa fa-search"></i><span></span></div>';
	var meta;

	var makefields = function(arr, schemaid, plus, path, type) {
		var schema = workshop.schemas.findItem('id', schemaid);
		for (var i = 0; i < schema.fields.length; i++) {

			var item = schema.fields[i];
			var islinked = item.islinked || item.type === 'user';

			if (islinked) {
				if (type === 'readonly') {
					makefields(arr, item.type, (plus ? (plus + ' / ') : '') + Thelpers.encode(item.label), (path ? (path + '.') : '') + item.name);
					continue;
				}
			}

			var obj = {};
			obj.id = item.id;
			obj.path = (path ? (path + '.') : '') + item.name;
			obj.name = (plus ? (plus + ' / ') : '') + (islinked ? ('<b>' + Thelpers.encode(item.label) + '</b>') : Thelpers.encode(item.label));
			obj.label = (plus ? (plus + ' / ') : '') + Thelpers.encode(item.label);
			obj.schemaid = schema.id;
			arr.push(obj);
		}
	};

	var makefieldname = function(schemaid, path) {
		var p = path.shift();
		var schema = workshop.schemas.findItem('id', schemaid);
		var item = schema.fields.findItem('name', p);
		if (item) {
			var next = '';
			if (path.length)
				next = makefieldname(item.type, path);
			if (next == null)
				return '';
			return next ? (item.label + ' / ' + next) : item.label;
		}
		return '';
	};

	var modify = function(name) {
		meta.component.editor.settings && meta.component.editor.settings(meta.element, meta.options, name, self.rebind);
	};

	self.make = function() {

		self.aclass(cls);
		self.append('<div class="{0}-remove"><button name="remove"><i class="fa fa-trash-o"></i>{1}</button></div>'.format(cls, config.btnremove) + '<div class="{0}-form"></div>'.format(cls));

		self.event('click', cls2 + '-item-editable,' + cls2 + '-item-readonly', function() {

			// HACK
			var view = workshop.view;

			var el = $(this);
			var parent = el.closest(cls2 + '-item');
			var name = parent.attrd('name');
			var type = parent.attrd('type');
			// var schema = workshop.schemas.findItem('id', view.schemaid);
			var db = [];

			makefields(db, view.schemaid, null, null, 'editable');
			var opt = {};
			opt.element = el;
			opt.align = 'left';
			opt.items = db;
			opt.raw = true;
			opt.placeholder = config.search;
			opt.callback = function(item) {
				el.find('span').text(item.label);
				meta.options[name] = item.path;
				modify(name);
			};

			SETTER('directory', 'show', opt);
		});

		self.event('change', 'input', function() {
			var el = $(this);
			var parent = el.closest(cls2 + '-item');
			var val = el.val();
			var name = parent.attrd('name');
			var opt = meta.settings.findItem('name', name);

			switch (opt.type) {
				case 'number':
					val = val.parseFloat();
					break;
			}

			meta.options[name] = val;
			modify(name);
		});

		self.event('click', 'button', function() {
			switch (this.name) {
				case 'remove':
					EXEC(self.makepath(config.remove), meta);
					break;
			}
		});
	};

	self.rebind = function() {
		self.find(cls2 + '-item').each(function() {
			var el = $(this);
			var type = el.attrd('type');
			var name = el.attrd('name');
			var val = meta.options[name];
			var tmp;
			switch (type) {
				case 'string':
					tmp = el.find('input');
					tmp.val(val == null ? '' : val);
					break;
				case 'readonly':
					tmp = el.find('span');
					tmp.text(val ? makefieldname(meta.schemaid, val.split('.')) : '');
					break;
				case 'editable':
					tmp = el.find('span');
					tmp.text(val ? makefieldname(meta.schemaid, val.split('.')) : '');
					break;
			}
		});
	};

	self.setter = function(value) {

		if (!value) {
			self.aclass('hidden');
			return;
		}

		var container = self.find(cls2 + '-form');

		if (meta && meta.name === value.name) {
			meta = value;
			self.rebind();
			self.rclass('hidden');
			return;
		}

		meta = value;

		var builder = [];
		var opt = value.settings;

		for (var i = 0; i < opt.length; i++) {
			var item = opt[i];
			switch (item.type) {
				case 'string':
					builder.push(template.format(cls, item.type, item.name, item.text, Tstring, item.hidden ? ' hidden' : ''));
					break;
				case 'readonly':
					builder.push(template.format(cls, item.type, item.name, item.text, Tfield, item.hidden ? ' hidden' : ''));
					break;
				case 'editable':
					builder.push(template.format(cls, item.type, item.name, item.text, Tfield, item.hidden ? ' hidden' : ''));
					break;
			}
		}

		self.aclass('invisible');
		self.rclass('hidden');
		container.html(builder.join(''));

		setTimeout(function() {
			self.rebind();
			self.rclass('invisible');
		}, 100);
	};

});
