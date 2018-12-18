var OP = {};
var OPENPLATFORM = OP;

OP.version = '3.0.0';
OP.callbacks = {};
OP.events = {};
OP.is = top !== window;
OP.pending = [];
OP.$appearance = 0;
OP.interval = setInterval(function() {
	if (OP.ready) {
		clearInterval(OP.interval);
		OP.pending.forEach(OP.$process);
	}
}, 500);

document.onkeydown = function(e) {
	if (e.keyCode === 116) {
		e.returnValue = false;
		e.keyCode = 0;
		if (location.href.indexOf('openplatform=') === -1)
			location.href = OP.tokenizator(location.href);
		else
			location.reload(true);
	}
};

OP.appearance = function() {
	OP.$appearance = 1;
	OP.send('appearance');
};

OP.screenshot = function(cdn) {

	if (!OP.$screenshot) {

		var scr;

		// IE 11
		if (!window.Promise) {
			scr = document.createElement('script');
			scr.type = 'text/javascript';
			scr.src = (cdn || '//cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.26.0') + '/polyfill.min.js';
			document.body.appendChild(scr);
		}

		scr = document.createElement('script');
		scr.type = 'text/javascript';
		scr.src = (cdn || '//html2canvas.hertzen.com/dist') + '/html2canvas.min.js';
		document.body.appendChild(scr);
		OP.$screenshot = 1;
	}

	var make = function() {
		OP.loading(true);
		html2canvas(document.body).then(function(canvas) {
			OP.send('screenshot', canvas.toDataURL('image/jpeg', 0.85));
			OP.loading(false);
		});
	};

	var interval = setInterval(function() {
		if (window.html2canvas) {
			clearInterval(interval);
			make();
		}
	}, 1000);

};

OP.launched = function(callback) {
	OP.send('launched', null, callback);
};

OP.progress = function(p) {
	return OP.send('progress', p);
};

OP.init = function(callback) {

	OP.ready = false;

	if (!callback)
		callback = function(is) {
			if (is == null) {
				OP.ready = true;
				return;
			}
			document.body.innerHTML = '401: Unauthorized';
			setTimeout(function() {
				window.close();
			}, 2000);
		};

	if (!OP.is) {
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
			OP.token = name.substring(13);
			accesstoken = decodeURIComponent(tmp.substring(tmp.indexOf('accesstoken=') + 12));
			break;
		}
	}

	var data = {};
	data.ua = navigator.userAgent;
	OP.accesstoken = accesstoken;

	var timeout = setTimeout(function() {
		timeout = null;
		callback('timeout');
		document.body.innerHTML = '401: Unauthorized';
	}, 2000);

	OP.send('verify', data, function(err, response) {
		if (timeout) {
			clearTimeout(timeout);
			OP.ready = !err;
			callback(null, response, setTimeout(function() {
				response.href && (location.href = response.href);
			}, 100));
		}
		timeout = null;
	});
};


document.addEventListener('click', function() {
	OP && OP.focus();
});

document.addEventListener('touchstart', function() {
	OP && OP.focus();
});

OP.loading2 = function(visible, interval) {

	OP.$loading2 && clearTimeout(OP.$loading2);

	if (!interval) {
		OP.send('loading2', visible);
		return;
	}

	OP.$loading2 = setTimeout(function(visible) {
		OP.send('loading2', visible);
	}, interval, visible);
};

OP.loading = function(visible, interval) {

	OP.$loading && clearTimeout(OP.$loading);

	if (!interval) {
		OP.send('loading', visible);
		return;
	}

	OP.$loading = setTimeout(function(visible) {
		OP.send('loading', visible);
	}, interval, visible);
};

OP.success = function(message, button) {
	return OP.snackbar(message, 'success', button);
};

OP.warning = function(message, button) {
	return OP.snackbar(message, 'warning', button);
};

OP.message = function(message, type, button) {
	var data = {};
	data.body = message;
	data.type = type;
	data.button = button;
	return OP.send('message', data);
};

OP.confirm = function(message, buttons, callback) {
	var data = {};
	data.body = message;
	data.buttons = buttons;
	return OP.send('confirm', data, function(err, button) {
		callback(button ? button.index : -1);
	});
};

OP.config = function(body, callback) {

	var data = {};

	if (typeof(body) === 'function') {
		callback = body;
		data.body = null;
	} else
		data.body = JSON.stringify(body);

	return OP.send('config', data, function(err, data) {
		callback && callback(data, err);
	});
};

OP.snackbar = function(message, type, button) {
	var data = {};
	data.body = message;
	data.type = type;
	data.button = button;
	return OP.send('snackbar', data, button);
};

OP.meta = function(callback) {
	var data = {};
	data.ua = navigator.userAgent;
	data.accesstoken = OP.accesstoken;
	OP.send('meta', data, function(err, response) {
		callback(err, response);
	});
};

OP.play = function(url) {
	if (!(/^(http|https):\/\//).test(url)) {
		if (url.substring(0, 1) !== '/')
			url = '/' + url;
		url = location.protocol + '//' + location.hostname + url;
	}
	return OP.send('play', url);
};

OP.stop = function(url) {
	return OP.send('stop', url);
};

OP.focus = function() {
	return OP.send('focus');
};

OP.maximize = function(url) {
	return OP.send('maximize', url);
};

OP.restart = function() {
	return OP.send('restart', location.href);
};

OP.open = function(id, data) {
	return OP.send('open', { id: id, data: data });
};

OP.minimize = function() {
	return OP.send('minimize');
};

OP.badge = function() {
	return OP.send('badge');
};

OP.log = function(message) {
	return OP.send('log', message);
};

OP.close = function() {
	return OP.send('kill');
};

OP.notify = function(type, body, data) {

	if (typeof(type) === 'string') {
		data = body;
		body = type;
		type = 0;
	}

	return OP.send('notify', { type: type, body: body, data: data || '', datecreated: new Date() });
};

OP.share = function(app, type, body, silent) {
	return OP.send('share', { app: typeof(app) === 'object' ? app.id : app, type: type, body: body, datecreated: new Date(), silent: silent });
};

OP.email = function(subject, body) {
	return OP.send('email', { subject: subject, body: body, datecreated: new Date() });
};

OP.send = function(type, body, callback) {

	if (typeof(body) === 'function') {
		callback = body;
		body = null;
	}

	var data = {};
	data.openplatform = true;
	data.accesstoken = OP.accesstoken;
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
		OP.callbacks[data.callback] = callback;
	}

	top.postMessage(JSON.stringify(data), '*');
	return OP;
};

OP.on = function(name, callback) {
	!OP.events[name] && (OP.events[name] = []);
	OP.events[name].push(callback);
	return OP;
};

OP.$process = function(data) {

	if (data.callback) {
		var callback = OP.callbacks[data.callback];
		if (callback) {
			if (data.sender)
				data.error = new Error('The application is not running in the OpenPlatform scope.');
			callback(data.error, data.body || {});
			delete OP.callbacks[data.callback];
		}
		return;
	}

	if (data.sender)
		return;

	if (data.type === 'appearance' && OP.$appearance) {

		var head = document.head || document.getElementsByTagName('head')[0];
		var style = document.createElement('style');

		if (OP.$appearance === 1) {
			OP.$appearance = 2;
		} else
			document.getElementById('opstyle').remove();

		var d = data.body;
		var b = document.body.classList;
		b.add(d.darkmode ? 'opdark' : 'oplight');
		b.add('opbody');
		b.remove(d.darkmode ? 'oplight' : 'opdark');

		if (!d.colorscheme)
			d.colorscheme = '#0a53ea';

		window.OPCOLOR = d.colorscheme;
		window.OPDARKMODE = d.darkmode;

		style.appendChild(document.createTextNode('.opbody{background-color:#' + (d.darkmode ? '202020' : 'FFFFFF') + '}body.opbody{color:#' + (d.darkmode ? 'E0E0E0' : '000000') + '}.opborder{border-color:' + d.colorscheme + '}.opbg{background-color:' + d.colorscheme + '}.opfg{color:' + d.colorscheme + '}'));
		style.id = 'opstyle';
		head.appendChild(style);
	}

	if (data.type === 'reload') {
		if (location.href.indexOf('openplatform=') === -1)
			location.href = OP.tokenizator(location.href);
		else
			location.reload(true);
		return;
	}

	if (data.type === 'screenshotmake') {
		OP.screenshot(data.body);
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
			OP.share(this.app, type, body);
		};
	}

	var events = OP.events[data.type];
	events && events.forEach(function(e) {
		e(data.body || {});
	});
};

window.addEventListener('message', function(e) {
	try {
		var data = JSON.parse(e.data);

		if (!data.openplatform)
			return;

		if (!OP.ready && data.type !== 'verify')
			OP.pending.push(data);
		else
			OP.$process(data);

	} catch (e) {}
}, false);

OP.tokenizator = function(url) {
	var index = url.indexOf('?');
	return index === -1 ? (url + ('?openplatform=' + OP.token)) : (url.substring(0, index + 1) + ('openplatform=' + OP.token + '&' + url.substring(index + 1)));
};

if (window.history) {
	history.pushState(null, null, location.href);
	window.onpopstate = function () {
		history.go(1);
	};
}