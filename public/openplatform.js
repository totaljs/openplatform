var OPENPLATFORM = {};

OPENPLATFORM.version = '3.0.0';
OPENPLATFORM.callbacks = {};
OPENPLATFORM.events = {};
OPENPLATFORM.is = top !== window;

OPENPLATFORM.init = function(callback) {

	if (!callback)
		callback = function(is) {
			if (is === true)
				return;
			document.body.innerHTML = '401: Unauthorized';
			setTimeout(function() {
				window.close();
			}, 2000);
		};

	if (!OPENPLATFORM.is) {
		callback(new Error('OpenPlatform isn\'t detected.'));
		return;
	}

	var arr = location.search.substring(1).split('&');
	var accesstoken = null;

	for (var i = 0, length = arr.length; i < length; i++) {
		var name = arr[i];
		if (name.substring(0, 13) === 'openplatform=') {
			var tmp = decodeURIComponent(name.substring(13));
			accesstoken = decodeURIComponent(tmp.substring(tmp.indexOf('accesstoken=') + 12));
			break;
		}
	}

	var data = {};
	data.ua = navigator.userAgent;
	OPENPLATFORM.accesstoken = accesstoken;

	var timeout = setTimeout(function() {
		timeout = null;
		callback('timeout');
	}, 1500);

	OPENPLATFORM.send('verify', data, function(err, response) {
		if (timeout) {
			clearTimeout(timeout);
			callback(null, response, setTimeout(function() {
				response.href && (location.href = response.href);
			}, 100));
		}
		timeout = null;
	});
};

document.addEventListener('click', function() {
	OPENPLATFORM && OPENPLATFORM.focus();
});

OPENPLATFORM.loading = function(visible, interval) {

	if (!interval) {
		OPENPLATFORM.send('loading', visible);
		return;
	}

	setTimeout(function(visible) {
		OPENPLATFORM.send('loading', visible);
	}, interval, visible);
};

OPENPLATFORM.message = function(message, type) {
	var data = {};
	data.body = message;
	data.type = type;
	return OPENPLATFORM.send('message', data);
};

OPENPLATFORM.confirm = function(message, buttons, callback) {
	var data = {};
	data.body = message;
	data.buttons = buttons;
	return OPENPLATFORM.send('confirm', data, callback);
};

OPENPLATFORM.snackbar = function(message, type) {
	var data = {};
	data.body = message;
	data.type = type;
	return OPENPLATFORM.send('snackbar', data);
};

OPENPLATFORM.meta = function(callback) {
	var data = {};
	data.ua = navigator.userAgent;
	data.accesstoken = OPENPLATFORM.accesstoken;
	OPENPLATFORM.send('meta', data, function(err, response) {
		callback(err, response);
	});
};

OPENPLATFORM.play = function(url) {
	return OPENPLATFORM.send('play', url);
};

OPENPLATFORM.stop = function(url) {
	return OPENPLATFORM.send('stop', url);
};

OPENPLATFORM.focus = function() {
	return OPENPLATFORM.send('focus');
};

OPENPLATFORM.maximize = function(url) {
	return OPENPLATFORM.send('maximize', url);
};

OPENPLATFORM.restart = function() {
	return OPENPLATFORM.send('restart', location.href);
};

OPENPLATFORM.open = function(id, data) {
	return OPENPLATFORM.send('open', { id: id, data: data });
};

OPENPLATFORM.minimize = function() {
	return OPENPLATFORM.send('minimize');
};

OPENPLATFORM.badge = function() {
	return OPENPLATFORM.send('badge');
};

OPENPLATFORM.log = function(message) {
	return OPENPLATFORM.send('log', message);
};

OPENPLATFORM.close = function() {
	return OPENPLATFORM.send('kill');
};

OPENPLATFORM.notify = function(type, body, url) {

	if (typeof(type) === 'string') {
		url = body;
		body = type;
		type = 0;
	}

	return OPENPLATFORM.send('notify', { type: type, body: body, url: url || '', datecreated: new Date() });
};

OPENPLATFORM.share = function(app, type, body, callback) {
	return OPENPLATFORM.send('share', { app: typeof(app) === 'object' ? app.id : app, type: type, body: body, datecreated: new Date() }, callback);
};

OPENPLATFORM.email = function(subject, body) {
	return OPENPLATFORM.send('email', { subject: subject, body: body, datecreated: new Date() });
};

OPENPLATFORM.send = function(type, body, callback) {

	if (typeof(body) === 'function') {
		callback = body;
		body = null;
	}

	var data = {};
	data.openplatform = true;
	data.accesstoken = OPENPLATFORM.accesstoken;
	data.type = type;
	data.body = body || null;
	data.sender = true;
	data.origin = location.origin;

	if (!top) {
		callback && callback(new Error('The application is not running in the OpenPlatform scope.'));
		return;
	}

	if (callback) {
		data.callback = (Math.random() * 1000000).toString(32).replace(/\./g, '');
		OPENPLATFORM.callbacks[data.callback] = callback;
	}

	top.postMessage(JSON.stringify(data), '*');
	return OPENPLATFORM;
};

OPENPLATFORM.on = function(name, callback) {
	!OPENPLATFORM.events[name] && (OPENPLATFORM.events[name] = []);
	OPENPLATFORM.events[name].push(callback);
	return OPENPLATFORM;
};

window.addEventListener('message', function(e) {
	try {
		var data = JSON.parse(e.data);

		if (!data.openplatform)
			return;

		if (data.callback) {
			var callback = OPENPLATFORM.callbacks[data.callback];
			if (callback) {
				if (data.sender)
					data.error = new Error('The application is not running in the OpenPlatform scope.');
				callback(data.error, data.body || {});
				delete OPENPLATFORM.callbacks[data.callback];
			}
			return;
		}

		if (data.sender)
			return;

		if (data.type === 'reload') {
			location.reload(true);
			return;
		}

		if (data.type === 'redirect') {
			location.href = data.body;
			return;
		}

		if (data.type === 'kill')
			data.type = 'close';

		var events = OPENPLATFORM.events[data.type];
		events && events.forEach(function(e) {
			e(data.body || {});
		});
	} catch (e) {}
}, false);