(function() {

	var W = window;
	var obj = {};
	var focused;

	obj.iframe = W.top !== W;
	obj.callbacks = {};
	obj.callbackindex = 0;
	obj.events = {};
	obj.ready = false;
	obj.version = 1;
	obj.origin = location.href;

	(function() {
		var arr = location.search.substring(1).split('&');
		for (var i = 0; i < arr.length; i++) {
			var name = arr[i];
			if (name.substring(0, 13) === 'openplatform=') {
				var tmp = decodeURIComponent(name.substring(13));
				obj.token = name.substring(13);
				obj.accesstoken = decodeURIComponent(tmp.substring(tmp.indexOf('token=') + 6));
				break;
			}
		}
	})();

	function sendfocus() {

		var dt = Date.now();

		if (!focused || focused < dt)
			obj.focus(true);

		focused = dt + 1000;
	}

	obj.on = function(name, fn) {
		if (obj.events[name])
			obj.events[name].push(fn);
		else
			obj.events[name] = [fn];
	};

	obj.play = function(name) {
		var msg = {};
		msg.TYPE = 'play';
		msg.data = name;
		obj.send(msg);
	};

	obj.success = function(body) {
		var msg = {};
		msg.TYPE = 'success';
		msg.data = body;
		obj.send(msg);
	};

	obj.warning = function(body) {
		var msg = {};
		msg.TYPE = 'warning';
		msg.data = body;
		obj.send(msg);
	};

	obj.error = function(body) {
		var msg = {};
		msg.TYPE = 'error';
		msg.data = body;
		obj.send(msg);
	};

	obj.focus = function(auto) {
		var msg = {};
		msg.TYPE = 'focus';
		msg.data = auto;
		obj.send(msg);
		if (!auto)
			W.focus();
	};

	obj.copy = function(text) {
		var msg = {};
		msg.TYPE = 'clipboard';
		msg.data = text;
		obj.send(msg);
		W.focus();
	};

	obj.path = function(path) {
		var msg = {};
		msg.TYPE = 'path';
		msg.data = path;
		obj.send(msg);
		W.focus();
	};

	obj.refresh = function() {
		var msg = {};
		msg.TYPE = 'refresh';
		obj.send(msg);
	};

	obj.refresh_account = function() {
		var msg = {};
		msg.TYPE = 'refresh_account';
		obj.send(msg);
	};

	obj.restart = function() {
		var msg = {};
		msg.TYPE = 'restart';
		obj.send(msg);
	};

	obj.feedback = function() {
		var msg = {};
		msg.TYPE = 'feedback';
		obj.send(msg);
	};

	obj.close = function() {
		var msg = {};
		msg.TYPE = 'close';
		obj.send(msg);
	};

	obj.send = function(msg) {

		if (msg.callback) {
			var key = (obj.callbackindex++) + '';
			obj.callbacks[key] = { fn: msg.callback, ts: Date.now() };
			msg.callbackid = key;
			delete msg.callback;
		}

		msg.totalplatform = true;
		msg.origin = location.origin + location.pathname;
		W.parent.postMessage(JSON.stringify(msg), '*');
	};

	obj.emitforce = function(name, a, b, c, d) {
		var arr = obj.events[name];
		if (arr) {
			for (var m of arr)
				m(a, b, c, d);
		}
	};

	obj.emit = function(name, a, b, c, d) {
		setTimeout(obj.emitforce, 1, name, a, b, c, d);
	};

	obj.tokenize = function(url) {
		var index = url.indexOf('?');
		return index === -1 ? (url + ('?openplatform=' + obj.token)) : (url.substring(0, index + 1) + ('openplatform=' + obj.token + '&' + url.substring(index + 1)));
	};

	function callbackexec(msg) {
		var key = msg.callbackid;
		var fn = obj.callbacks[key];
		if (fn) {
			delete obj.callbacks[key];
			fn.fn(msg.data, msg.error);
		}
	}

	if (obj.iframe) {
		W.addEventListener('message', function(e) {

			if (typeof(e.data) !== 'string')
				return;

			try {

				var msg = JSON.parse(e.data);
				if (msg.callbackid)
					setTimeout(callbackexec, 2, msg);

				if (msg.TYPE === 'init') {
					obj.ready = true;
					obj.emit('init');
					return;
				}

				if (msg.TYPE === 'event') {
					var arr = obj.events[msg.name];
					if (arr) {
						for (var i = 0; i < arr.length; i++)
							arr[i].apply(W, msg.args);
					}
				}

				if (msg.TYPE === 'focus' || msg.TYPE === 'path') {
					if (msg.data) {
						obj.href = msg.data;
						obj.emit('path', msg.data, true);
					}
					W.focus();
					return;
				}

				if (msg.TYPE === 'mobilemenu') {
					obj.emit('mobilemenu');
					return;
				}

				if (msg.TYPE === 'appearance') {
					APP.sounds = msg.data.sounds !== false;
					APP.notifications = msg.data.notifications !== false;
					APP.color = msg.data.color;
					obj.emit('appearance', msg.data);
					W.APPEARANCE && W.APPEARANCE({ color: msg.data.color });
					return;
				}

			} catch (e) {
				console.error(e);
				// unhandled error
			}

		}, false);

		document.addEventListener('touchstart', sendfocus, { passive: true });
		document.addEventListener('click', sendfocus);
		document.addEventListener('keydown', function(e) {
			var is = false;
			if (e.keyCode === 112) {
				// F1
				is = true;
				var msg = {};
				msg.TYPE = 'quicksearch';
				obj.send(msg);
			} else if (e.keyCode === 116) {
				// F5
				setTimeout(function() {
					location.reload(true);
				}, 200);
				is = true;
			} else if (e.keyCode === 9 && (e.altKey || e.ctrlKey || e.metaKey)) {
				// CTRL/ALT/CMD + TAB
				is = true;
				var msg = {};
				msg.TYPE = 'nextwindow';
				obj.send(msg);
			}

			if (is) {
				e.returnValue = false;
				e.keyCode = 0;
				return false;
			}

		});
	}

	W.APP = obj;

	setTimeout(function() {
		var msg = {};
		msg.TYPE = 'init';
		obj.send(msg);
		W.APP_INIT && W.APP_INIT();
	}, 2);

})();