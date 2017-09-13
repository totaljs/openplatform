const SERVICEACCOUNT = { id: '0000000000000000000', name: 'Service account', sa: true };
var DDOS = {};

F.onAuthorize = function(req, res, flags, next) {

	var key = (req.ip + (req.headers['user-agent'] || '')).substring(0, 50);

	// Acccess Token
	if (req.headers.token) {
		if (DDOS[key] > 5)
			return next(false);
		if (req.headers.token === F.accesstoken)
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

	if (DDOS[key] > 5)
		return next(false);

	cookie = F.decrypt(cookie);

	if (!cookie) {
		if (DDOS[key])
			DDOS[key]++;
		else
			DDOS[key] = 1;
		return next(false);
	}

	var user = F.global.users.findItem('id', cookie.id);
	user.datelogged = F.datetime;
	user.online = true;
	next(true, user);
};

F.on('service', function(counter) {
	if (counter % 5 === 0)
		DDOS = {};
});