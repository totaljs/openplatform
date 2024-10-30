exports.install = function() {
	ROUTE('SOCKET /sync/ @text', socket);
};

function socket($) {

	$.autodestroy(() => MAIN.ws = null);
	MAIN.ws = $;

	$.on('open', function(client) {
		client.authorized = CONF.sync && client.query.token == CONF.sync_token;
		if (!client.authorized)
			setTimeout(client => client.close(4001), 500, client);
	});

	$.on('message', function(client, message) {
		if (client.authorized) {
			if (client.query.resend)
				$.send(message);
			else
				$.send(message, conn => conn !== client);
		}
	});
}