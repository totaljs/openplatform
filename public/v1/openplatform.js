var OPENPLATFORM = {};

OPENPLATFORM.version = '1.0.0';
OPENPLATFORM.callbacks = {};
OPENPLATFORM.events = {};
OPENPLATFORM.is = top !== window;

OPENPLATFORM.loading = function(visible) {
	return OPENPLATFORM.send('loading', visible);
};

OPENPLATFORM.maximize = function(url) {
	return OPENPLATFORM.send('maximize', url);
};

OPENPLATFORM.open = function(id) {
	return OPENPLATFORM.send('open', id);
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

OPENPLATFORM.getProfile = function(callback) {
	return OPENPLATFORM.send('profile', callback);
};

OPENPLATFORM.getApplications = function(callback) {
	return OPENPLATFORM.send('applications', callback);
};

OPENPLATFORM.getUsers = function(callback) {
	return OPENPLATFORM.send('users', callback);
};

OPENPLATFORM.getInfo = function(callback) {
	return OPENPLATFORM.send('info', callback);
};

OPENPLATFORM.onMinimize = function(callback) {
	return OPENPLATFORM.on('minimize', callback);
};

OPENPLATFORM.onMaximize = function(callback) {
	return OPENPLATFORM.on('maximize', callback);
};

OPENPLATFORM.onClose = function(callback) {
	return OPENPLATFORM.on('kill', callback);
};

OPENPLATFORM.send = function(type, body, callback) {

	if (typeof(body) === 'function') {
		callback = body;
		body = null;
	}

	var data = {};
	data.openplatform = true;
	data.type = type;
	data.body = body || null;
	data.sender = true;

	if (!top) {
		if (callback)
			callback(new Error('The application is not runned in the openplatform scope.'));
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
					data.error = new Error('The application is not runned in the openplatform scope.');
				callback(data.error, data.body || {});
				delete OPENPLATFORM.callbacks[data.callback];
			}
			return;
		}

		if (data.sender)
			return;

		var events = OPENPLATFORM.events[data.type];
		if (!events)
			return;
		events.forEach(function(e) {
			e(data.body || {});
		});
	} catch (e) {}
}, false);