const SERVICEACCOUNT = { id: '0000000000000000000', name: 'Service Account', sa: true };
var DDOS = {};

AUTH(function(req, res, flags, next) {

	var key = (req.ip + (req.headers['user-agent'] || '')).substring(0, 50);

	// Acccess Token
	var token = req.headers['x-token'];
	if (token) {

		if (DDOS[key] > 5) {
			FUNC.logger('protection', key);
			return next(false);
		}

		if (token === CONF.accesstoken)
			return next(true, SERVICEACCOUNT);

		if (DDOS[key])
			DDOS[key]++;
		else
			DDOS[key] = 1;

		return next(false);
	}

	var cookie = req.cookie(CONF.cookie);
	if (!cookie)
		return next(false);

	if (DDOS[key] > 5) {
		FUNC.logger('protection', key);
		return next(false);
	}

	cookie = F.decrypt(cookie);

	if (cookie) {

		var sessionkey = cookie.id;

		// Reads session
		FUNC.sessions.get(sessionkey, function(err, user) {

			if (user) {
				next((user.inactive || user.blocked) ? false : true, user);
				return;
			}

			// Reads a user from DB
			FUNC.users.get(cookie.id, function(err, user) {
				if (user && !user.inactive && !user.blocked) {

					user.datelogged = NOW;
					user.online = true;

					if (user.language && user.language !== 'en')
						req.$language = user.language;

					// Write session
					FUNC.sessions.set(sessionkey, user);

					// Write info
					FUNC.users.set(user, ['datelogged', 'online']);

					// Continue
					next(true, user);

				} else
					next(false);
			});
		});

	} else {

		if (DDOS[key])
			DDOS[key]++;
		else
			DDOS[key] = 1;

		next(false);
});

ON('service', function(counter) {
	if (counter % 5 === 0)
		DDOS = {};
});