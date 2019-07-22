const SERVICEACCOUNT = { id: '0000000000000000000', name: 'Service Account', sa: true, service: true };
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

	if (CONF.guest && $.cookie(CONF.cookie) === 'guest') {
		$.success(OP.guest);
		return;
	}

	var opt = {};
	opt.key = CONF.cookie_key || 'auth';
	opt.name = CONF.cookie;
	opt.expire = CONF.cookie_expiration == null ? '3 days' : CONF.cookie_expiration === 'session' ? '' : CONF.cookie_expiration;

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

			var locked = false;

			if (profile.locking && profile.pin && meta.used && !$.req.mobile && meta.used < NOW.add('-' + profile.locking + ' minutes'))
				locked = true;

			$.req.$language = profile.language;
			$.req.locked = (meta.settings ? meta.settings.indexOf('locked:1') != -1 : false) || locked;

			if (profile.windows == null)
				profile.windows = true;

			if (profile.online === false || locked) {
				profile.online = true;
				OP.session.set(meta.sessionid, meta.id, profile, opt.expire, meta.note, 'locked:' + (locked ? 1 : 0));
			}

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