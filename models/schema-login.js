var DDOS = {};

// Clears DDOS protection
F.on('service', function(interval) {
	if (interval % 20 === 0)
		DDOS = {};
});

NEWSCHEMA('Login').make(function(schema) {

	schema.define('login', 'String(100)', true);
	schema.define('password', 'String(50)', true);

	schema.setPrepare(function(name, value) {
		if (name === 'password')
			return value.hash('sha256');
	});

	schema.addWorkflow('exec', function(error, model, controller, callback) {

		var err = protection(controller);
		if (err) {
			error.push(err);
			return callback();
		}

		var user = USERS.findItem('login', model.login);
		if (!user || user.password !== model.password) {
			error.push('error-login');
			return callback();
		}

		if (user.blocked) {
			error.push('error-login-blocked');
			return callback();
		}

		// Creates cookie
		controller.cookie(CONFIG('cookie'), F.encrypt({ id: user.id, resetcounter: user.resetcounter, expire: F.datetime.add(CONFIG('cookie-expiration')).getTime() }), '5 days');

		// Sends a response
		callback(SUCCESS(true));
	});

	schema.addWorkflow('token', function(error, model, controller, callback) {

		var err = protection(controller);
		if (err) {
			error.push(err);
			return callback();
		}

		var user = USERS.findItem('token', controller.query.token);
		if (!user) {
			error.push('error-token');
			return callback();
		}

		user.tokenizer();
		controller.cookie(CONFIG('cookie'), F.encrypt({ id: user.id, resetcounter: user.resetcounter, expire: F.datetime.add(CONFIG('cookie-expiration')).getTime() }), '5 days');
		callback(SUCCESS(true));
	});

});

function protection(controller) {
	var req = controller.req;
	var ua = req.headers['user-agent'];
	if (!ua)
		return 'error-login-useragent';
	ua = ua.hash();
	var key = ua + '-' + req.ip.hash();
	if (DDOS[key] === undefined)
		DDOS[key] = 1;
	else
		DDOS[key]++;
	return DDOS[key] > 5 ? 'error-login-ddos' : null;
}