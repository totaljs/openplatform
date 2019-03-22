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

	var opt = {};
	opt.key = CONF.cookie_key || 'auth';
	opt.name = CONF.cookie;
	opt.expire = CONF.cookie_expiration;

	OP.session.getcookie(req, opt, function(err, profile, meta) {

		if (profile == null) {

			if (DDOS[key])
				DDOS[key]++;
			else
				DDOS[key] = 1;

			if (DDOS[key] > 5)
				FUNC.logger('protection', key);

			next(false);
		} else {
			req.$sessionid = meta.sessionid;
			req.$language = profile.language;
			next(true, profile);
		}
	});
});

ON('service', function(counter) {
	if (counter % 5 === 0)
		DDOS = {};
});