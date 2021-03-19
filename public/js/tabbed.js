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

COMPONENT('scroller', '', function(self, config, cls) {

	var scrollbar;
	var area;

	self.blind();
	self.readonly();

	self.make = function() {

		self.aclass(cls);

		scrollbar = document.createElement('DIV');
		area = document.createElement('DIV');
		scrollbar.classList.add(cls + '-scrollbar');
		area.classList.add(cls + '-area');

		for (var i = 0; i < self.dom.children.length; i++)
			area.appendChild(self.dom.children[i]);

		scrollbar.appendChild(area);
		self.dom.appendChild(scrollbar);

		self.resize();
	};

	self.resize = function() {
		setTimeout2(self.ID, self.resizeforce, 200);
	};

	self.resizeforce = function() {

		var w = 0;

		for (var i = 0; i < area.children.length; i++) {
			var child = area.children[i];
			w += $(child).width();
		}

		var css = {};
		css.width = w;
		$(area).css(css);
	};

	self.setter = function() {
		self.resize();
	};

});

COMPONENT('main', 'padding:15;margin:80', function(self, config, cls) {

	self.make = function() {
		self.aclass(cls);
		self.resize();
		ON('resize + resize2', self.resize);
	};

	self.resize = function() {
		self.css({ left: config.padding, width: WW - config.padding * 2, height: WH - (config.padding * 2) - config.margin });
	};

});