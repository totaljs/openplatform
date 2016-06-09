window.openplatform = true;

$(document).on('ready', function() {
	$('.logo').on('click', function() {
		$('.menu').toggleClass('menu-visible');
	});
});

$(window).on('message', function(e) {
		var data = JSON.parse(e.originalEvent.data);
		if (!data.openplatform)
			return;
		var processes = FIND('processes');
		var item = processes.findItem(e.originalEvent.source);
		var tmp;
		var app;

		if (!item)
			return;

		switch (data.type) {

			case 'profile':

				if (!item)
					return;

				tmp = $.extend({}, user);
				delete tmp.widgets;
				app = dashboard.applications.findItem('id', item.id);
				if (app)
					tmp.roles = app.roles;
				processes.message(item, 'profile', tmp, data.callback);
				break;

			case 'info':
				tmp = {};
				tmp.openplatform = true;
				tmp.version = common.version;
				tmp.name = common.name;
				tmp.url = common.url;
				tmp.language = common.language;
				tmp.isfocused = common.isfocused;
				tmp.ismobile = isMOBILE;
				tmp.datetime = common.datetime;
				processes.message(item, 'info', tmp, data.callback);
				break;

			case 'users':

				if (!item)
					return;

				app = dashboard.applications.findItem('id', item.id);
				if (!app)
					return;

				if (!app.users) {
					processes.message(item, 'users', null, data.callback, new Error('You don\'t have permissions for this operation.'));
					return;
				}

				AJAXCACHE('GET /internal/dashboard/users/', function(response, err) {
					processes.message(item, 'users', response, data.callback, err);
				}, 1000 * 120);

				break;

			case 'maximize':

				if (!item)
					return;

				app = dashboard.applications.findItem('id', item.id);
				// TODO: add user privileges
				if (app)
					SETTER('processes', 'open', app.id, data.body);
				break;

			case 'loading':
				SETTER('loading', data.body ? 'show' : 'hide');
				break;

			case 'notify':

				if (!item)
					return;

				app = dashboard.applications.findItem('id', item.id);
				if (!app || !app.notifications)
					return;
				dashboard_notifications_process([{ internal: app.internal, datecreated: data.body.datecreated, type: data.body.type, body: data.body.body, url: data.body.url }]);
				break;

			case 'minimize':

				if (!item)
					return;

				app = dashboard.applications.findItem('id', item.id);
				if (app && dashboard.current === app.id)
					SETTER('processes', 'minimize');
				break;

			case 'open':
				app = dashboard.applications.findItem('id', data.body);
				if (app)
					SET('dashboard.current', app.id);
				break;

			case 'kill':

				if (!item)
					return;

				app = dashboard.applications.findItem('id', item.id);
				if (app)
					SETTER('processes', 'kill', item.id);
				break;


			case 'applications':

				if (!item)
					return;

				app = dashboard.applications.findItem('id', item.id);

				if (!app)
					return;

				if (!app.applications) {
					processes.message(item, 'applications', null, data.callback, new Error('You don\'t have permissions for this operation.'));
					return;
				}

				var arr = [];
				for (var i = 0, length = dashboard.applications.length; i < length; i++) {
					tmp = $.extend({}, dashboard.applications[i]);
					delete tmp.events;
					delete tmp.internal;
					delete tmp.widgets;
					arr.push(tmp);
				}

				processes.message(item, 'applications', arr, data.callback);
				break;
		}
});

function isError(err) {
	if (!err)
		return false;
	err = err.toString().toLowerCase();
	if (err.indexOf('unauthorized') === -1)
		location.href = '/';
	return true;
}

function isOffline() {
	if (navigator.onLine === undefined)
		return false;
	return navigator.onLine !== true;
}

Tangular.register('urlencode', function(value) {
	return encodeURIComponent(value);
});

Tangular.register('photo', function(value) {
	if (!value)
		return '/img/face.jpg';
	return '/photos/' + value.replace(/@|\./g, '_') + '.jpg';
});

Array.prototype.pagination = function(max) {
	var length = this.length;
	var pages = Math.ceil(length / max);
	return { pages: pages, count: length };
};

Array.prototype.paginate = function(skip, take) {
	var arr = [];
	var self = this;
	for (var i = 0, length = self.length; i < length; i++) {
		if (arr.length >= take)
			break;
		if (i >= skip)
			arr.push(self[i]);
	}
	return arr;
};

function success() {
	var el = $('#success');
	SETTER('loading', 'hide', 500);
	el.css({ right: '90%' }).delay(500).fadeIn(100).animate({ right: '2%' }, 1500, 'easeOutBounce', function() {
		setTimeout(function() {
			el.fadeOut(200);
		}, 800);
	});
}

jQuery.easing.easeOutBounce = function(e, f, a, h, g) {
	if ((f /= g) < (1 / 2.75)) {
		return h * (7.5625 * f * f) + a
	} else {
		if (f < (2 / 2.75)) {
			return h * (7.5625 * (f -= (1.5 / 2.75)) * f + 0.75) + a
		} else {
			if (f < (2.5 / 2.75)) {
				return h * (7.5625 * (f -= (2.25 / 2.75)) * f + 0.9375) + a
			} else {
				return h * (7.5625 * (f -= (2.625 / 2.75)) * f + 0.984375) + a
			}
		}
	}
};
