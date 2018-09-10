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
		if (token === F.accesstoken)
			return next(true, SERVICEACCOUNT);
		if (DDOS[key])
			DDOS[key]++;
		else
			DDOS[key] = 1;
		return next(false);
	}

	var cookie = req.cookie(F.config.cookie);
	if (!cookie)
		return next(false);

	if (DDOS[key] > 5) {
		LOGGER('protection', key);
		return next(false);
	}

	cookie = F.decrypt(cookie);

	if (cookie) {
		var user = F.global.users.findItem('id', cookie.id);
		if (user) {
			user.datelogged = F.datetime;
			user.online = true;
			next(true, user);
		} else
			next(false);
		return;
	}

	if (DDOS[key])
		DDOS[key]++;
	else
		DDOS[key] = 1;

	return next(false);
});

ON('service', function(counter) {

	if (counter % 5 === 0)
		DDOS = {};

	// Notifications: each 1 hour
	if (counter % 60 !== 0)
		return;

	var messages = [];

	for (var i = 0, length = F.global.users.length; i < length; i++) {

		var user = F.global.users[i];
		if (user.inactive || user.blocked || !user.notificationsemail || !user.countnotifications)
			continue;

		if (user.datenotifiedemail && user.datenotifiedemail.add('12 hour') > F.datetime)
			continue;

		user.datenotifiedemail = F.datetime;
		var message = F.mail(user.email, '@(Unread notifications)', '/mails/notifications', user, user.language);
		message.manually();
		messages.push(message);
		LOGGER('email', user.id + ': ' + user.name + '(' + user.email + '): ' + user.countnotifications + 'x');
	}

	if (messages.length) {
		OP.saveState(2);
		Mail.send2(messages, F.error());
	}
});