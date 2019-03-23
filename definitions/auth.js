const SERVICEACCOUNT = { id: '0000000000000000000', name: 'Service Account', sa: true };
var DDOS = {};

AUTH(function($) {

	var key = ($.ip + ($.headers['user-agent'] || '')).substring(0, 50);

	// Acccess Token
	var token = $.headers['x-token'];
	if (token) {

		if (DDOS[key] > 5) {
			FUNC.logger('protection', key);
			return $.invalid();
		}

		if (token === CONF.accesstoken)
			return $.success(SERVICEACCOUNT);

		if (DDOS[key])
			DDOS[key]++;
		else
			DDOS[key] = 1;

		return $.invalid();
	}

	var opt = {};
	opt.key = CONF.cookie_key || 'auth';
	opt.name = CONF.cookie;
	opt.expire = CONF.cookie_expiration;

	OP.session.getcookie($, opt, function(err, profile, meta) {

		if (profile == null) {

			if (DDOS[key])
				DDOS[key]++;
			else
				DDOS[key] = 1;

			if (DDOS[key] > 5)
				FUNC.logger('protection', key);

			$.invalid();
		} else {

			$.req.$language = profile.language;

			if (profile.online === false) {
				profile.online = true;
				OP.session.set2(meta.id, profile);
			}

			$.success(profile);
		}
	});
});

ON('service', function(counter) {
	if (counter % 5 === 0)
		DDOS = {};
});