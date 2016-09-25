window.openplatform = true;

if (window.Notification && window.Notification.permission !== 'granted')
	window.Notification.requestPermission();

$(document).ready(function() {
	jR.clientside('.jR');

	$('.logo').on('click', function() {
		if (['md', 'lg'].indexOf(WIDTH()) === -1)
			$('.menu').toggleClass('menu-visible');
		else
			jR.redirect('/');
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

			AJAXCACHE('GET /internal/dashboard/users/', function(response) {

				var arr = [];

				response.forEach(function(item) {
					var user = $.extend({}, item);
					user.roles = user.applications[app.internal] || [];
					user.has = user.applications[app.internal] ? true : false;
					delete user.applications;
					arr.push(user)
				});

				processes.message(item, 'users', arr, data.callback);
			}, 1000 * 120);

			break;

		case 'maximize':

			if (!item)
				return;

			app = dashboard.applications.findItem('id', item.id);
			app && SETTER('processes', 'open', app.id, data.body);
			break;

		case 'restart':
			app = dashboard.applications.findItem('id', item.id);

			if (app) {
				SETTER('loading', 'show');
				SETTER('processes', 'kill', app.id);
				setTimeout(function() {
					SETTER('processes', 'open', app.id, data.body || app.url);
				}, 4000);
			}

			break;

		case 'loading':
			SETTER('loading', data.body ? 'show' : 'hide');
			break;

		case 'warning':
		case 'success':
			SETTER('message', data.type, data.body);
			break;

		case 'play':
		case 'stop':
			SETTER('audio', data.type, data.body);
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
			app && dashboard.current === app.id && SETTER('processes', 'minimize');
			break;

		case 'open':
			app = dashboard.applications.findItem('id', data.body.id);

			if (app) {
				SET('dashboard.current', app.id);
				data.body.message && WAIT(function() {
					item = processes.findItem(e.originalEvent.source);
					return item != null;
				}, function(err) {
					!err && processes.message(item, 'message', data.body.message);
				}, 1500, 15000);
			}

			break;

		case 'kill':

			if (!item)
				return;

			app = dashboard.applications.findItem('id', item.id);
			app && SETTER('processes', 'kill', item.id);
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
				delete tmp.url_session;
				delete tmp.internal;
				delete tmp.widgets;
				arr.push(tmp);
			}

			processes.message(item, 'applications', arr, data.callback);
			break;
	}
});

jR.on('location', function(url) {
	$('.menu').removeClass('menu-visible').find('a').each(function() {
		var el = $(this);
		el.toggleClass('selected', el.attr('href') === url);
	});
});

WATCH('common.form', function(path, value) {
	if (!value || common.forms[value])
		return;
	common.forms[value] = true;
	IMPORT('/templates/form-{0}.html'.format(value));
}, true);

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

function success() {
	var el = $('#success');
	SETTER('loading', 'hide', 500);
	el.delay(500).fadeIn(100, function() {
		setTimeout(function() {
			el.fadeOut(200);
		}, 3000);
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

function onImageError(image) {
	// image.onerror = null;
	image.src = '/img/empty.png';
	return true;
}

function createSession(iframe, url, callback) {

	var chrome = navigator.userAgent.match(/Chrome|CriOS/gi) ? true : false;
	var safari = navigator.userAgent.indexOf('Safari') > -1;

	if (chrome && safari)
		safari = false;

	var w = 200;
	var h = 120;
	var left = (screen.width /2) - (w / 2);
	var top = (screen.height / 2) - (h / 2);
	SETTER('loading', 'show');

	if (!safari) {
		iframe.attr('src', url);
		iframe.css({ opacity: 0 });
		iframe.on('load', function() {
			SETTER('loading', 'hide', 1000);
			iframe.off('load');
			callback();
			setTimeout(function() {
				iframe.animate({ opacity: 1 }, 500);
			}, 1000);
		});
		return;
	}

	var w = window.open(url, 'OpenPlatform initialization', 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
	$(w).ready(function() {
		setTimeout(function() {
			SETTER('loading', 'hide', 1000);
			w.close();
			w = null;
			callback();
		}, 1000);
	});
}

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

Array.prototype.hasRoles = function(value) {
	for (var i = 0, length = this.length; i < length; i++) {
		if (value.indexOf(this[i]) === -1)
			return false;
	}
	return true;
};

String.prototype.isJSON = function() {
	var self = this;
	if (self.length <= 1)
		return false;

	var l = self.length - 1;
	var a;
	var b;
	var i = 0;

	while (true) {
		a = self.substring(i, i + 1);
		i++;
		if (a === ' ' || a === '\n' || a === '\r' || a === '\t')
			continue;
		break;
	}

	while (true) {
		b = self.substring(l, l + 1);
		l--;
		if (b === ' ' || b === '\n' || b === '\r' || b === '\t')
			continue;
		break;
	}

	return (a === '"' && b === '"') || (a === '[' && b === ']') || (a === '{' && b === '}');
};