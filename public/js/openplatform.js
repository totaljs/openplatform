var OP = {};

OP.version = 429;
OP.callbacks = {};
OP.events = {};
OP.is = parent !== window;
OP.pending = [];
OP.$appearance = 0;
OP.interval = setInterval(function() {
	if (OP.ready) {
		clearInterval(OP.interval);
		OP.pending.forEach(OP.$process);
		OP.pending = [];
	}
}, 500);

OP.jcomponent = function(notembedded) {

	var qt = '';
	var qr = '';
	var ql = '';

	function cachetoken() {
		qt = NAV.query.openplatform;
		qr = NAV.query.rev;
		ql = NAV.query.language;
	}

	cachetoken();

	ON('request', function(opt) {

		if (!qt)
			cachetoken();

		var index = opt.url.indexOf('?');
		var raw = index === -1 ? opt.url : opt.url.substring(0, index);
		raw = raw.substring(raw.indexOf('/', 9) + 1);
		var end = raw.substring(raw.length - 10);
		index = end.indexOf('.');
		if (index === -1)
			opt.headers.Authorization = 'base64 ' + btoa(qt + ',' + qr + ',' + ql);
	});

	ON('@flag showloading', function() {
		OP.loading(true);
	});

	ON('@flag hideloading', function() {
		OP.loading(false, 1000);
	});

	OP.onready = function(meta) {
		if (meta.dateformat) {

			DEF.dateformat = meta.dateformat;

			if (W.user) {
				user.timeformat = meta.timeformat;
				user.dateformat = meta.dateformat;
				user.numberformat = meta.numberformat;
				DEF.languagehtml = user.language;
			}

			switch (meta.numberformat) {
				case 1: // 1 000.12
					DEF.decimalseparator = '.';
					DEF.thousandsseparator = ' ';
					break;
				case 2: // 1 000,12
					DEF.decimalseparator = ',';
					DEF.thousandsseparator = ' ';
					break;
				case 3: // 1.000,12
					DEF.decimalseparator = ',';
					DEF.thousandsseparator = '.';
					break;
				case 4: // 1,000.12
					DEF.decimalseparator = '.';
					DEF.thousandsseparator = ',';
					break;
			}

			var ts = (DEF.timeformat === 12 ? '!' : '') + (DEF.dateformat + ' - HH:mm') + (DEF.timeformat === 12 ? ' a' : '');
			ENV('date', DEF.dateformat);
			ENV('ts', ts);
		}

		OP.$appearance = 1;
		OP.send('appearance');
		EMIT('opready');
		SET('common.ready', true, 500);
	};

	OP.init(notembedded);
};

document.addEventListener('click', function(e) {

	var target = e.target;
	var tmp = target;

	if (tmp.tagName !== 'A') {
		var index = 3;
		while (--index >= 0) {
			tmp = tmp.parentNode;
			if (!tmp || tmp.tagName === 'BODY' || tmp.tagName === 'HTML')
				break;
			if (tmp.tagName === 'A') {
				target = tmp;
				break;
			}
		}
	}

	if (target.tagName === 'A') {

		if (target.href.substring(0, 15) === 'openplatform://') {

			var app = target.href.substring(15);
			var index = app.indexOf('?');
			var data = index === - 1 ? '' : app.substring(index + 1);

			if (index !== -1)
				app = app.substring(0, index);

			e.preventDefault();

			if (data) {
				var arr = data.split('&');
				data = {};
				for (var i = 0; i < arr.length; i++) {
					var arg = arr[i].split('=');
					if (arg[0])
						data[arg[0]] = arg[1] && decodeURIComponent(arg[1]);
				}
			}

			OP.share(app, 'link', data);
			return false;
		}
	}

	OP && OP.$sendfocus();
});

document.onkeydown = function(e) {

	var is = false;

	if (e.keyCode === 112) {
		// F1
		is = true;
		OP.send('quicksearch');
	} else if (e.keyCode === 116) {
		// F5
		OP.loading(false);
		OP.offline(false);
		OP.progress(0);
		setTimeout(function() {
			if (location.href.indexOf('openplatform=') === -1)
				location.href = OP.tokenizator(location.href);
			else
				location.reload(true);
		}, 200);
		is = true;
	} else if (e.keyCode === 9 && (e.altKey || e.ctrlKey || e.metaKey)) {
		// CTRL/ALT/CMD + TAB
		is = true;
		OP.send('nextwindow');
	}

	if (is) {
		e.returnValue = false;
		e.keyCode = 0;
		return false;
	}

};

OP.changelog = function(body) {
	OP.send('changelog', { body: body });
};

OP.help = function(body) {
	OP.send('help', { body: body });
};

OP.success2 = function(msg, show, plus) {
	OP.console('success', msg, show, plus);
};

OP.titlesuccess = function(msg) {
	OP.send('titlesuccess', msg);
};

OP.install = function(url) {
	OP.send('install', { type: 'install', url: url });
};

OP.titlewarning = function(msg) {
	if (msg instanceof Array)
		msg = msg[0].error;
	OP.send('titlewarning', msg);
};

OP.warning2 = function(msg, show, plus) {
	OP.console('warning', msg, show, plus);
};

OP.error2 = function(msg, show, plus) {
	OP.console('error', msg, show, plus);
};

OP.info2 = function(msg, show, plus) {
	OP.console('info', msg, show, plus);
};

OP.busy = function(is) {
	OP.send('busy', is);
};

OP.appearance = function() {
	OP.$appearance = 1;
	OP.send('appearance');
};

OP.console = function(type, msg, show, text) {

	if (msg instanceof Array) {
		for (var i = 0; i < msg.length; i++) {
			var m = msg[i];
			if (m && m.error)
				m = m.error;
			m && OP.send('console', { type: type, msg: (text || '') + m, show: show });
		}
	} else
		OP.send('console', { type: type, msg: (text || '') + msg, show: show });
};

OP.command = function(type, body) {
	OP.send('command', { type: type, body: body });
};

OP.screenshot = function(cdn, callback) {

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
			if (callback)
				callback(canvas.toDataURL('image/jpeg', 0.85));
			else
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

OP.init = function(callback, notembedded) {

	if (typeof(callback) === 'boolean') {
		embeded = callback;
		callback = null;
	}

	OP.ready = false;

	if (notembedded)
		OP.is = true;

	OP.embeded = !notembedded;

	if (!callback) {
		callback = function(is) {
			if (is == null) {
				OP.ready = true;
				return;
			}

			if (document.body)
				document.body.innerHTML = '401: Unauthorized';
			else
				throw new Error('401: Unauthorized');

			setTimeout(function() {
				window.close();
			}, 2000);
		};
	}

	if (!OP.is) {
		callback(new Error('OpenPlatform isn\'t detected.'));
		document.body.innerHTML = '401: Unauthorized';
		return;
	}

	var arr = location.search.substring(1).split('&');
	var accesstoken = null;
	for (var i = 0; i < arr.length; i++) {
		var name = arr[i];
		if (name.substring(0, 13) === 'openplatform=') {
			var tmp = decodeURIComponent(name.substring(13));
			OP.token = name.substring(13);
			accesstoken = decodeURIComponent(tmp.substring(tmp.indexOf('token=') + 6));
			break;
		}
	}

	var data = {};
	data.ua = navigator.userAgent;
	OP.accesstoken = accesstoken;

	document.addEventListener('DOMContentLoaded', function() {

		if (notembedded) {
			OP.ready = true;
			var usr = window.user || {};
			callback && setTimeout(callback, 100, null, usr);
			OP.onready && OP.onready({});
			OP.$process({ type: 'appearance', body: { colorscheme: usr.colorscheme, darkmode: usr.darkmode }});
			window.addEventListener('resize', function() {
				OP.emit('resize');
			});
			OP.emit('ready');
			return;
		}

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
			OP.id = response.id;
			OP.openplatformurl = response.openplatformurl;
			OP.onready && OP.onready(response);
			OP.emit('ready');
		});

	});
};

OP.$sendfocus = function() {
	var dt = Date.now();
	if (!OP.$focus || OP.$focus < dt)
		OP.focus();
	OP.$focus = dt + (1000 * 2);
};

document.addEventListener('touchstart', function() {
	OP && OP.$sendfocus();
}, { passive: true });

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

	var obj = { show: visible, text: '' };

	if (typeof(interval) === 'string') {
		obj.text = interval;
		interval = 0;
	}

	if (!interval) {
		OP.send('loading', obj);
		return;
	}

	OP.$loading = setTimeout(function(obj) {
		OP.send('loading', obj);
	}, interval, obj);
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

OP.confirm2 = function(message, buttons, callback) {
	OP.confirm(message, buttons instanceof Array ? buttons : buttons.split(',').trim(), function(index) {
		!index && callback();
	});
};

OP.approve = function(message, button, callback) {
	OP.confirm(message, [button], callback);
};

OP.confirm = function(message, buttons, callback) {
	var data = {};
	data.body = message;
	data.buttons = buttons instanceof Array ? buttons : buttons.split(',').trim();
	var scope = window.M && window.M.scope ? window.M.scope() : null;
	return OP.send('confirm', data, function(err, button) {
		scope && window.M.scope(scope);
		callback(button ? button.index : -1);
	});
};

OP.options = function(fn, callback) {
	OP.on('options', function() {
		var arr = [];
		fn(arr);
		var scope = window.M && window.M.scope ? window.M.scope() : null;
		OP.send('options', arr, function(err, selected) {
			scope && window.M.scope(scope);
			selected && callback(selected);
		});
	});
};

OP.config = function(body, callback) {

	var data = {};

	if (typeof(body) === 'function') {
		callback = body;
		data.body = null;
	} else
		data.body = JSON.stringify(body);

	var scope = window.M && window.M.scope ? window.M.scope() : null;
	return OP.send('config', data, function(err, data) {
		scope && window.M.scope(scope);
		callback && callback(data, err);
	});
};

OP.clipboard = function(text) {
	OP.send('clipboard', text);
};

OP.snackbar = function(message, type, button) {
	var data = {};
	data.body = message;
	data.type = type;
	data.button = button;
	return OP.send('snackbar', data, button);
};

OP.offline = function(message) {
	OP.send('offline', message);
};

OP.meta = function(callback) {
	var data = {};
	data.ua = navigator.userAgent;
	data.accesstoken = OP.accesstoken;
	var scope = window.M && window.M.scope ? window.M.scope() : null;
	OP.send('meta', data, function(err, response) {
		scope && window.M.scope(scope);
		callback(err, response);
	});
};

OP.play = function(url) {

	if (!((/^[a-z]+$/).test(url)) && !(/^(http|https):\/\//).test(url)) {
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

OP.badge = function(type) {
	return OP.send('badge', type);
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

	return OP.send('notify', { type: type, body: body, data: data || '', dtcreated: new Date() });
};

OP.share = function(app, type, body, silent) {
	setTimeout(function() {
		OP.send('share', { app: app && typeof(app) === 'object' ? app.id : app, type: type, body: body, dtcreated: new Date(), silent: silent });
	}, 100);
	return OP;
};

OP.report = function(type, body, high) {
	return OP.send('report', { type: type, body: body, high: high });
};

OP.mail = function(email, subject, body, type) {
	return OP.send('mail', { email: email, subject: subject, body: body, dtcreated: new Date(), type: type || 'html' });
};

OP.shake = function(type) {
	return OP.send('shake', type);
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
	data.origin = location.origin;

	if (!top) {
		callback && callback(new Error('The application is not running in the OpenPlatform scope.'));
		return;
	}

	if (callback) {
		data.callback = (Math.random() * 1000000).toString(32).replace(/\./g, '');
		OP.callbacks[data.callback] = callback;
	}

	parent.postMessage(JSON.stringify(data), '*');
	return OP;
};

OP.on = function(name, callback) {
	if (name === 'print' || name === 'options')
		OP.events[name] = null;
	!OP.events[name] && (OP.events[name] = []);
	OP.events[name].push(callback);
	return OP;
};

OP.on('print', function() {
	window.print();
});

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

	if (data.type === 'link') {
		var events = OP.events[data.type];
		if (events) {
			for (var i = 0; i < events.length; i++)
				events[i](data.body.path, data.body.data);
		}
		return;
	}

	if (data.type === 'command') {
		var events = OP.events[data.type];
		if (events) {
			for (var i = 0; i < events.length; i++)
				events[i](data.body.type, data.body.body);
		}
		return;
	}

	if (data.type === 'focus') {
		window.focus();
		return;
	}

	if (data.type === 'appearance' && OP.$appearance) {

		var head = document.head || document.getElementsByTagName('head')[0];
		var style = document.createElement('style');
		var tmp;

		if (OP.$appearance === 1) {
			OP.$appearance = 2;
		} else {
			tmp = document.getElementById('opstyle');
			tmp && tmp.parentNode.removeChild(tmp);
		}

		var d = data.body || data;
		var b = document.body.classList;

		if (OP.darkmode !== false) {
			b.add(d.darkmode ? 'opdark' : 'oplight');
			d.darkmode && b.add('ui-dark');
			b.add('opbody');
			b.remove(d.darkmode ? 'oplight' : 'opdark');
			!d.darkmode && b.remove('ui-dark');
			window.OPDARKMODE = d.darkmode;
		}

		if (d.color)
			d.colorscheme = d.color;

		if (!d.colorscheme)
			d.colorscheme = '#4285f4';

		window.OPCOLOR = d.colorscheme;

		style.appendChild(document.createTextNode(':root{--opcolor:' + d.colorscheme + ';--color:' + d.colorscheme + '}.opbody{background-color:#' + (d.darkmode ? '202020' : 'FFF') + '}body.opbody{color:#' + (d.darkmode ? 'E0E0E0' : '000') + '}.opborder,.opborderhover:hover{border-color:' + d.colorscheme + '!important}.opbg,.opbghover:hover{background-color:' + d.colorscheme + '!important}.opfg,.opfghover:hover{color:' + d.colorscheme + '!important}'));
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
	if (events) {
		var d = {};
		for (var i = 0; i < events.length; i++)
			events[i](data.body || d);
	}
};

OP.emit = function(name, a, b, c, d, e) {
	var events = OP.events[name];
	if (events && events.length) {
		for (var i = 0; i < events.length; i++)
			events[i](a, b, c, d, e);
	} else {
		if (name === 'help' || name === 'changelog')
			OP.send(name, null);
	}
};

OP.done = function(message, callback, loading) {

	if (typeof(message) === 'function') {
		loading = callback;
		callback = message;
		message = null;
	}

	if (loading == null)
		loading = true;

	var scope = window.M && window.M.scope ? window.M.scope() : null;
	return function(response, err) {

		loading && OP.loading(false, 500);
		scope && window.M.scope(scope);

		if (!response && err)
			response = [{ name: 'network', error: err }];

		if (response instanceof Array) {
			OP.send('done', response);
		} else {
			message && OP.send('done', message);
			callback && callback(response, err);
		}
	};
};

OP.resume = function(callback, loading) {
	var scope = window.M && window.M.scope ? window.M.scope() : null;
	return function(response, err) {
		scope && window.M.scope(scope);
		loading && OP.loading(false, 500);
		if (!response && err)
			response = [{ name: 'network', error: err }];
		if (response instanceof Array) {
			OP.send('done', response);
		} else {
			if (typeof(callback) === 'function')
				callback(response);
			else
				SETR(callback, response);
		}
	};
};

window.addEventListener('message', function(e) {
	try {
		var data = JSON.parse(e.data);

		if (!data.openplatform)
			return;

		// OpenPlatform cloud
		if (data.TYPE)
			data.type = data.TYPE;

		if (!OP.ready && data.type !== 'verify')
			OP.pending.push(data);
		else
			OP.$process(data);

	} catch (e) {
		// unhandled error
	}
}, false);

OP.link = function(path, data) {

	var key = 'OPLINKINPUT';
	var input = window[key];
	if (!input) {
		input = document.createElement('INPUT');
		input.style = 'position:absolute;left:-100px;top:-100px;opacity:0';
		document.body.appendChild(input);
		window[key] = input;
	}

	var data = JSON.stringify({ id: OP.id, path: path, data: data });
	data = data.substring(1, data.length - 1);

	var v = OP.openplatformurl + '?share=' + btoa(encodeURIComponent(data)).replace(/=/g, '');
	setTimeout(function() {
		input.value = v;
		input.focus();
		input.select();
		document.execCommand('copy');
	}, 100);

	return v;
};

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