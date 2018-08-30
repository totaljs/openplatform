var OPENPLATFORM = {};

OPENPLATFORM.version = '3.0.0';
OPENPLATFORM.callbacks = {};
OPENPLATFORM.events = {};
OPENPLATFORM.is = top !== window;
OPENPLATFORM.pending = [];
OPENPLATFORM.interval = setInterval(function() {
	if (OPENPLATFORM.ready) {
		clearInterval(OPENPLATFORM.interval);
		OPENPLATFORM.pending.forEach(OPENPLATFORM.$process);
		return;
	}
}, 500);

OPENPLATFORM.screenshot = function() {

	if (!OPENPLATFORM.$screenshot) {

		var scr;

		// IE 11
		if (!window.Promise) {
			scr = document.createElement('script');
			scr.type = 'text/javascript';
			scr.src = '//cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.26.0/polyfill.min.js';
			document.body.appendChild(scr);
		}

		scr = document.createElement('script');
		scr.type = 'text/javascript';
		scr.src = '//html2canvas.hertzen.com/dist/html2canvas.min.js';
		document.body.appendChild(scr);
		OPENPLATFORM.$screenshot = 1;
	}

	var make = function() {
		html2canvas(document.body).then(function(canvas) {
			OPENPLATFORM.send('screenshot', canvas.toDataURL('image/jpeg', 0.85));
		});
	};

	var interval = setInterval(function() {
		if (window.html2canvas) {
			clearInterval(interval);
			make();
		}
	}, 1000);

};

OPENPLATFORM.launched = function(callback) {
	OPENPLATFORM.send('launched', null, callback);
};

OPENPLATFORM.progress = function(p) {
	return OPENPLATFORM.send('progress', p);
};

OPENPLATFORM.init = function(callback) {

	OPENPLATFORM.ready = false;

	if (!callback)
		callback = function(is) {
			if (is == null) {
				OPENPLATFORM.ready = true;
				return;
			}
			document.body.innerHTML = '401: Unauthorized';
			setTimeout(function() {
				window.close();
			}, 2000);
		};

	if (!OPENPLATFORM.is) {
		callback(new Error('OpenPlatform isn\'t detected.'));
		document.body.innerHTML = '401: Unauthorized';
		return;
	}

	var arr = location.search.substring(1).split('&');
	var accesstoken = null;

	for (var i = 0, length = arr.length; i < length; i++) {
		var name = arr[i];
		if (name.substring(0, 13) === 'openplatform=') {
			var tmp = decodeURIComponent(name.substring(13));
			OPENPLATFORM.token = name.substring(13);
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
		document.body.innerHTML = '401: Unauthorized';
	}, 2000);

	OPENPLATFORM.send('verify', data, function(err, response) {
		if (timeout) {
			clearTimeout(timeout);
			OPENPLATFORM.ready = !err;
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
	if (!(/^(http|https):\/\//).test(url)) {
		if (url.substring(0, 1) !== '/')
			url = '/' + url;
		url = location.protocol + '//' + location.hostname + url;
	}
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

OPENPLATFORM.notify = function(type, body, data) {

	if (typeof(type) === 'string') {
		data = body;
		body = type;
		type = 0;
	}

	return OPENPLATFORM.send('notify', { type: type, body: body, data: data || '', datecreated: new Date() });
};

OPENPLATFORM.share = function(app, type, body) {
	return OPENPLATFORM.send('share', { app: typeof(app) === 'object' ? app.id : app, type: type, body: body, datecreated: new Date() });
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
	data.origin = location.protocol + '//' + location.hostname;

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

OPENPLATFORM.$process = function(data) {

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
		if (location.href.indexOf('openplatform=') === -1)
			location.href = OPENPLATFORM.tokenizator(location.href);
		else
			location.reload(true);
		return;
	}

	if (data.type === 'screenshotmake') {
		OPENPLATFORM.screenshot();
		return;
	}

	if (data.type === 'redirect') {
		location.href = data.body;
		return;
	}

	if (data.type === 'kill')
		data.type = 'close';


	if (data.type === 'share') {
		data.body.share = function(type, body) {
			OPENPLATFORM.share(this.app, type, body);
		};
	}

	var events = OPENPLATFORM.events[data.type];
	events && events.forEach(function(e) {
		e(data.body || {});
	});
};

window.addEventListener('message', function(e) {
	try {
		var data = JSON.parse(e.data);

		if (!data.openplatform)
			return;

		if (!OPENPLATFORM.ready && data.type !== 'verify')
			OPENPLATFORM.pending.push(data);
		else
			OPENPLATFORM.$process(data);

	} catch (e) {}
}, false);

OPENPLATFORM.tokenizator = function(url) {
	var index = url.indexOf('?');
	return index === -1 ? (url + ('?openplatform=' + OPENPLATFORM.token)) : (url.substring(0, index + 1) + ('openplatform=' + OPENPLATFORM.token + '&' + url.substring(index + 1)));
};