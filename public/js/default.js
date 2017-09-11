var common = {};

common.page = '';
common.form = '';
common.inlineform = '';
common.notifications = false;
common.data = {};

NAV.clientside('.jr');
SETTER(true, 'loading', 'hide', 500);

WATCH('common.page', function() {
	SETTER('inlineform', 'hide');
});

ON('resize', function() {
	var h = $(window).height();
	$('.scrollable').css('height', h - 50);
	$('.ui-process-iframe').css('height', h - 50);
	$('.fullheight').each(function() {
		var el = $(this);
		el.css('height', h - (el.offset().top + 20));
	});
});

$(window).on('resize', function() {
	EMIT('resize');
});

ON('ready', function() {
	EMIT('resize');
});

function home() {
	REDIRECT('/');
}

AJAX('GET /api/meta/', 'common.meta');

function onImageError(image) {
	// image.onerror = null;
	image.src = '/img/empty.png';
	return true;
}

Tangular.register('photo', function(value) {
	return value ? ('/photos/' + value) : '/img/face.jpg';
});

$(window).on('message', function(e) {
	var data = JSON.parse(e.originalEvent.data);

	if (!data.openplatform)
		return;

	var app = dashboard.apps.findItem('accesstoken', data.accesstoken);
	if (!app || app.url.indexOf(data.origin) === -1)
		return;

	var processes = FIND('processes');

	switch (data.type) {

		case 'verify':
		case 'meta':
			if (app && navigator.userAgent === data.body.ua) {
				var iframe = processes.findProcess(app.id);
				var meta = CLONE(iframe.meta);
				meta.internal = undefined;
				meta.index = undefined;
				meta.running = undefined;
				meta.accesstoken = undefined;
				meta.data = common.data[app.id];
				processes.message(iframe, 'verify', meta, data.callback);
				iframe.meta.href = undefined;
			}
			break;

		case 'maximize':
			app && SET('dashboard.current', app);
			break;

		case 'restart':

			if (app) {
				common.messages[app.id] = data.message;
				SETTER('loading', 'show');
				app.href = data.url;
				processes.kill(app.id);
				setTimeout(function() {
					SET('dashboard.current', app);
				}, 4000);
			}

			break;

		case 'loading':
			SETTER('loading', data.body ? 'show' : 'hide');
			break;

		case 'message':
			SETTER('notify', data.body.body, data.body.type);
			break;

		case 'play':
		case 'stop':
			SETTER('audio', data.type, data.body);
			break;

		case 'notify':
			if (!app || !app.internal.notifications)
				return;
			AJAX('POST /api/notify/?accesstoken=' + app.accesstoken, data.body, NOOP);
			break;

		case 'minimize':
			app && processes.minimize();
			break;

		case 'open':
			common.data[data.body.id] = data.body.data;
			var el = $('.app[data-id="{0}"]'.format(data.body.id));
			el.length && el.trigger('click');
			break;

		case 'kill':
			app && processes.kill(app.id);
			break;
	}
});

FIND('modificator', function(com) {

	com.register('submit', function(value, element, e) {

		if (e.type === 'init') {
			e.fa = element.find('i');
			return;
		}

		if (e.type === 'click')
			e.fa.aclass('fa fa-spin fa-refresh');
		else
			e.fa.rclass();

	});
});
