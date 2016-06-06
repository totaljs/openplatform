var OPENPLATFORM = {};

OPENPLATFORM.version = '1.0.0';
OPENPLATFORM.callbacks = {};
OPENPLATFORM.events = {};
OPENPLATFORM.is = top !== window;

function OP_SEND(type, body, callback) {

	var data = {};
	data.openplatform = true;
	data.type = type;
	data.body = body;
	data.sender = true;

	if (!top) {
		if (callback)
			callback(new Error('Application is not runned in the openplatform scope.'));
		return;
	}

	if (callback) {
		data.callback = (Math.random() * 1000000).toString(32).replace(/\./g, '');
		OPENPLATFORM.callbacks[data.callback] = callback;
	}

	top.postMessage(JSON.stringify(data), '*');
}

function OP_ON(name, callback) {
	if (!OPENPLATFORM.events[name])
		OPENPLATFORM.events[name] = [];
	OPENPLATFORM.events[name].push(callback);
}

function OP_PROFILE(callback) {
	OP_SEND('profile', null, callback);
}

function OP_APPLICATIONS(callback) {
	OP_SEND('applications', null, callback);
}

function OP_USERS(callback) {
	OP_SEND('users', null, callback);
}

function OP_INFO(callback) {
	OP_SEND('info', null, callback);
}

function OP_MINIMIZE(callback) {
	OP_ON('minimize', callback);
}

function OP_MAXIMIZE(callback) {
	OP_ON('maximize', callback);
}

function OP_CLOSE(callback) {
	OP_ON('kill', callback);
}

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

OP_INFO(function(err, response) {
	if (err)
		return;
	OPENPLATFORM.info = response;
});