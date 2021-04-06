ON('loaded', function() {

	var opt = {};

	opt.secret = CONF.auth_secret;
	opt.cookie = CONF.auth_cookie;
	opt.strict = false;
	opt.expire = '5 minutes';
	opt.ddos = 10;
	opt.options = { samesite: 'lax' };

	opt.onauthorize = function($) {

		if ($.query.accesstoken) {
			$.invalid();
			return true;
		}

		if (CONF.guest && $.cookie(CONF.auth_cookie) === 'guest') {
			$.success(MAIN.guest);
			return true;
		}

	};

	opt.onsession = function(session, $) {

		var user = session.data;
		var locked = user.locked == true;

		$.req.$langauge = user.language;

		if (!locked && (user.locking && user.pin && user.dtlogged2 && !$.req.mobile && user.dtlogged2 < NOW.add('-' + user.locking + ' minutes'))) {
			locked = true;
			DBMS().query('UPDATE tbl_user_session SET locked=true WHERE id=' + PG_ESCAPE(session.sessionid));
		}

		$.req.$language = user.language;
		$.req.locked = locked;

		user.ip = $.ip;

		if (user.desktop == null)
			user.desktop = 1;

		if (user.online === false || locked)
			user.online = true;

		if (!user.dtlogged2 || user.dtlogged2.getDate() !== NOW.getDate()) {
			user.mobile = $.req.mobile;
			user.dtlogged2 = NOW;
			user.ua = ($.headers['user-agent'] || '').parseUA();
			FUNC.usage_logged(user);
		}

		if ($.req.url === '/logout/')
			return;

		if ($.req.locked) {
			$.invalid(user);
			return true;
		}

	};

	opt.onread = function(meta, next) {
		var db = DBMS();
		db.one('tbl_user_session').fields('locked,profileid,dtlogged').id(meta.sessionid);
		db.error(404);
		db.mod('tbl_user_session', { online: true, dtlogged: NOW, '+logged': 1, ip: meta.ip }).id(meta.sessionid).where('userid', meta.userid).where('dtexpire>NOW()').nobind();
		db.callback(function(err, session) {
			if (session) {
				MAIN.readuser(meta.userid, function(err, response) {
					if (response) {
						response.rev = GUID(5);
						response.dtlogged2 = session.dtlogged;
						response.locked = session.locked;
						response.profileid = session.profileid;
						DBMS().mod('tbl_user', { dtlogged: NOW, online: true }).id(meta.userid).nobind();
					}
					next(err, response);
				});
			} else
				next();
		});
	};

	opt.onfree = function(meta) {
		var mod = { online: false };
		var db = DBMS();

		db.modify('tbl_user_session', mod).query('online=TRUE').id(meta.sessions);

		if (meta.users.length)
			db.modify('tbl_user', mod).query('online=TRUE').id(meta.users);

		// db.log({ ID: 'Sessions.free' }, null, 'Expired: ' + meta.sessions.length + ', offline: ' + meta.users.length);
	};

	AUTH(opt);
	MAIN.session = opt;

	opt.update = function(userid, fn) {
		for (var m in opt.sessions) {
			var session = opt.sessions[m];
			if (session.userid === userid)
				fn(session.data);
		}
	};

	var db = DBMS();
	db.query('UPDATE tbl_user_session SET online=FALSE WHERE online=TRUE');
	db.query('UPDATE tbl_user SET online=FALSE WHERE online=TRUE');

	LOCALIZE(req => req.query.language);
});
