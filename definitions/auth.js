var DDOS = {};

AUTH(function($) {

	var key = ($.ip + ($.headers['user-agent'] || '')).substring(0, 50);

	// Acccess Token
	var token = $.headers['x-token'];
	if (token) {

		if (DDOS[key] > 5) {
			// FUNC.logger('protection', key);
			return $.invalid();
		}

		if (DDOS[key])
			DDOS[key]++;
		else
			DDOS[key] = 1;

		return $.invalid();
	}

	if (CONF.guest && $.cookie(CONF.cookie) === 'guest') {
		$.success(MAIN.guest);
		return;
	}

	var opt = {};
	opt.key = CONF.cookie_key || 'auth';
	opt.name = CONF.cookie;
	opt.expire = CONF.cookie_expiration || '3 days';
	opt.ddos = 5;

	MAIN.session.getcookie($, opt, function(err, profile, meta, init) {

		if (profile == null) {

			if (DDOS[key])
				DDOS[key]++;
			else
				DDOS[key] = 1;

			$.invalid();

		} else {

			var locked = false;

			if (profile.locking && profile.pin && meta.used && !$.req.mobile && meta.used < NOW.add('-' + profile.locking + ' minutes'))
				locked = true;

			$.req.$language = profile.language;
			$.req.locked = (meta.settings ? meta.settings.indexOf('locked:1') != -1 : false) || locked;

			profile.ip = $.ip;

			if (profile.desktop == null)
				profile.desktop = 1;

			if (profile.online === false || locked) {
				profile.online = true;
				MAIN.session.set(meta.sessionid, meta.id, profile, opt.expire, meta.note, 'locked:' + (locked ? 1 : 0));
			}

			if (init)
				profile.ua = ($.headers['user-agent'] || '').parseUA();

			if ($.req.locked)
				$.invalid(profile);
			else
				$.success(profile);
		}
	});
});

ON('service', function(counter) {
	if (counter % 5 === 0)
		DDOS = {};
});