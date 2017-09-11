var OPENPLATFORM = {};

OPENPLATFORM.version = '2.0.0';
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
			accesstoken = decodeURIComponent(name.substring(13));
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

OPENPLATFORM.loading = function(visible) {
	return OPENPLATFORM.send('loading', visible);
};

OPENPLATFORM.message = function(message, type) {
	var data = {};
	data.body = message;
	data.type = type;
	return OPENPLATFORM.send('message', data);
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
		callback && callback(new Error('The application is not runned in the openplatform scope.'));
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
	if (!OPENPLATFORM.events[name])
		OPENPLATFORM.events[name] = [];
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