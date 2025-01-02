const RECONNECT_TIMEOUT = 10000;

exports.install = function() {
	ROUTE('SOCKET /sync/', socket);
};

function socket($) {

	MAIN.ws = $;
	$.autodestroy(() => MAIN.ws = null);

	let pending = [];
	let timeout = null;

	var resend = function() {

		if (timeout || !pending.length)
			return;

		let msg = pending.shift();
		if (msg) {
			$.send(msg.text, client => client != msg.client);
			setImmediate(resend);
		}
	};

	var resend_force = function() {
		timeout = null;
		setImmediate(resend);
	};

	$.on('open', function(client) {
		client.confirmed = CONF.sync && client.query.token == CONF.sync_token;
		if (!client.confirmed)
			setTimeout(client => client.close(4001), 500, client);
	});

	$.on('close', function(client) {
		if (client.confirmed) {
			timeout && clearTimeout(timeout);
			timeout = setTimeout(resend_force, RECONNECT_TIMEOUT);
		}
	});

	$.on('message', function(client, message) {
		if (client.confirmed) {
			if (timeout)
				pending.push({ client: client, text: message });
			else
				$.send(message, conn => conn !== client);
		}
	});
}