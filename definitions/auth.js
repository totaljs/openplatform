const SERVICEACCOUNT = { id: '0000000000000000000', name: 'Service Account', sa: true };
var DDOS = {};

AUTH(function(req, res, flags, next) {

	var key = (req.ip + (req.headers['user-agent'] || '')).substring(0, 50);

	// Acccess Token
	var token = req.headers['x-token'];
	if (token) {

		if (DDOS[key] > 5) {
			LOGGER('protection', key);
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
		LOGGER('protection', key);
		return next(false);
	}

	cookie = F.decrypt(cookie);

	if (cookie) {

		var sessionkey = cookie.id;

		// Checks session
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
					FUNC.sessions.set(sessionkey, user, '10 minutes');
					FUNC.users.set(user, ['datelogged', 'online']);
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
	}
});

ON('service', function(counter) {

	if (counter % 5 === 0)
		DDOS = {};

	// Notifications: each 1 hour
	if (counter % 60 !== 0)
		return;

	// Locks this operation
	FUNC.sessions.lock('notifications', '10 minutes', function() {

		// Streams all users
		FUNC.users.stream({ limit: 50 }, function(users, next) {

			var changed = [];
			var messages = [];

			for (var i = 0, length = users.length; i < length; i++) {

				var user = users[i];
				if (!user || user.inactive || user.blocked || !user.notificationsemail || !user.countnotifications)
					continue;

				if (user.datenotifiedemail && user.datenotifiedemail.add('12 hours') > NOW)
					continue;

				user.datenotifiedemail = NOW;

				if (CONF.mail_smtp) {
					var message = MAIL(user.email, '@(Unread notifications)', '/mails/notifications', user, user.language);
					message.manually();
					messages.push(message);
					LOGGER('email', user.id + ': ' + user.name + '(' + user.email + '): ' + user.countnotifications + 'x');
				}

				changed.push(user);
				FUNC.emit('unread', user.id);
			}

			if (messages.length) {

				FUNC.users.set(changed, ['datenotifiedemail']);

				Mail.send2(messages, function(err) {
					err && FUNC.error('notifications', err);
					next();
				});
			}

			next();

		}, () => FUNC.sessions.unlock('notifications'));
	});
});