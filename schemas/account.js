NEWACTION('Account/session', {
	name: 'Read session data',
	action: async function($) {
		$.callback($.user);
	}
});

NEWACTION('Account/read', {
	name: 'Read account data',
	action: async function($) {

		var profile = await DATA.read('op.tbl_user').fields('id,email,name,gender,dtbirth,photo,language,color,interface,unread,darkmode,logged,sounds,notifications,sa,dtlogged,isdisabled,isinactive,isremoved,isconfirmed').id($.user.id).promise($);

		if (!profile || profile.isdisabled || profile.isinactive || profile.isremoved || !profile.isconfirmed) {
			MAIN.auth.logout($, () => $.invalid(401));
			return;
		}

		profile.isdisabled = undefined;
		profile.isinactive = undefined;
		profile.isremoved = undefined;
		profile.isconfirmed = undefined;
		profile.isreset = $.user.isreset;

		if (CONF.welcome) {
			profile.welcome = true;
			CONF.welcome = false;
		}

		if (!CONF.url) {
			CONF.url = $.controller.hostname();
			DATA.modify('op.cl_config', { value: CONF.url }).id('url');
		}

		profile = await $.transform('profile', profile);
		$.callback(profile);
	}
});

NEWACTION('Account/update', {
	name: 'Update account',
	input: 'photo:String, *name:String, *email:Email, language:Lower, notifications:Boolean, sounds:Boolean, interface:String, color:Color, darkmode:Number',
	publish: '+id',
	action: async function($, model) {

		await DATA.check('op.tbl_user').where('email', model.email).where('id', '<>', $.user.id).where('isremoved=FALSE').error('@(E-mail address is already used)', true).promise($);
		model.dtupdated = NOW;
		await DATA.modify('op.tbl_user', model).id($.user.id).promise($);

		MAIN.auth.refresh($.user.id);
		$.success();

		model.id = $.user.id;
		$.publish(model);
	}
});

NEWACTION('Account/apps', {
	name: 'List of apps',
	action: function($) {
		FUNC.permissions($.user.id, async function(data) {
			if (data && data.apps.length) {

				var apps = await DATA.find('op.tbl_app').fields('id,name,icon,color,isnewtab,isbookmark,isexternal,isscrollbar,sortindex').in('id', data.apps).where('isremoved=FALSE AND isdisabled=FALSE').promise($);
				var userapps = await DATA.find('op.tbl_user_app').where('userid', $.user.id).in('appid', data.apps).query('appid IN (SELECT x.id FROM op.tbl_app x WHERE x.isremoved=FALSE AND x.isdisabled=FALSE)').promise($);

				for (var app of userapps) {
					var origin = apps.findItem('id', app.appid);
					origin.isfavorite = app.isfavorite;
					origin.notifications = app.notifications;
					origin.muted = app.muted;
					if (app.sortindex !== 0)
						origin.sortindex = app.sortindex;
				}

				$.callback(apps);

			} else
				$.callback(EMPTYARRAY);
		});
	}
});

NEWACTION('Account/reorder', {
	name: 'Reorder apps',
	input: '*id:[UID]',
	action: function($, model) {

		FUNC.permissions($.user.id, async function(data) {

			var builder = [];
			var userapps = await DATA.find('op.tbl_user_app').fields('id,appid,sortindex').where('userid', $.user.id).in('appid', data.apps).promise($);

			for (var i = 0; i < model.id.length; i++) {

				var id = model.id[i];

				// Check the app existence
				if (!data.apps.includes(id))
					continue;

				var ua = userapps.findItem('appid', id);

				if (ua) {
					// modify
					id && builder.push('UPDATE op.tbl_user_app SET sortindex={0}, dtupdated=NOW() WHERE id=\'{1}\';'.format(i + 1, ua.id));
				} else {
					// create
					await DATA.insert('op.tbl_user_app', { id: $.user.id + id, userid: $.user.id, appid: id, notifications: true, sortindex: i + 1, dtupdated: NOW }).promise($);
				}

			}

			if (builder.length)
				await DATA.query(builder.join('\n')).promise($);

			$.success();
		});

	}
});

NEWACTION('Account/run', {
	name: 'Run app',
	params: '*appid:UID',
	publish: 'id,sessionid,appid,userid,name,color,icon,user,device,ip,dtcreated:Date,dtexpire:Date',
	action: function($) {
		FUNC.permissions($.user.id, async function(data) {

			var params = $.params;

			if (!data.apps.includes(params.appid)) {
				$.invalid('@(App not found)');
				return;
			}

			var app = await DATA.read('op.tbl_app').fields('id,url,icon,color,name,reqtoken,restoken,isdisabled,isbookmark,isexternal').id(params.appid).error('@(App not found)').where('isremoved=FALSE').promise($);

			if (app.isdisabled) {
				$.invalid('@(App has been temporary disabled)');
				return;
			}

			var session = {};
			session.id = Date.now().toString(36) + GUID(10);
			session.sessionid = $.sessionid || $.user.sessionid;
			session.userid = $.user.id;
			session.appid = app.id;
			session.ip = $.ip;
			session.device = $.mobile ? 'mobile' : 'desktop';
			session.dtcreated = NOW;
			session.dtexpire = NOW.add(CONF.app_session_expire || '1 day');

			if (!app.isbookmark) {

				session.url = CONF.url + '/verify/?token=' + FUNC.checksum(session.id + 'X' + CONF.id);
				session.reqtoken = session.url.md5(app.reqtoken).toLowerCase();
				session.restoken = session.reqtoken.md5(app.restoken);

				// Remove previous one (due to security)
				// await DATA.remove('op.tbl_app_session').where('appid', app.id).where('sessionid', session.sessionid).promise($);
			}

			// Register a new session
			await DATA.insert('op.tbl_app_session', session).promise($);
			await DATA.query('UPDATE op.tbl_app SET logged=logged+1, dtlogged=NOW() WHERE id=' + PG_ESCAPE(app.id)).promise();

			if (app.isbookmark)
				app.url = QUERIFY(app.url, { ssid: FUNC.checksum(session.id + 'X' + session.sessionid) });
			else
				app.url = QUERIFY(app.url, { openplatform: session.url + '~' + session.reqtoken });

			app.reqtoken = undefined;
			app.restoken = undefined;

			$.callback(app);

			if (CONF.$tms) {
				session.reqtoken = undefined;
				session.restoken = undefined;
				session.url = app.url;
				session.icon = app.icon;
				session.color = app.color;
				session.name = app.name;
				session.user = $.user.name;
				$.publish(session);
			}

		});
	}
});

NEWACTION('Account/token', {
	name: 'Login by token',
	query: '*token:String',
	action: async function($) {

		var token = $.query.token;
		var arr = token.split('X');

		if (FUNC.checksum(arr[0]) !== token) {
			$.invalid('@(Invalid token)');
			return;
		}

		var profile = await DATA.read('op.tbl_user').fields('id,language,name,isdisabled,isinactive,isconfirmed,isreset').where('token', token).where('isremoved=FALSE').error('@(Account not found)').promise($);

		$.language = profile.language;

		if (profile.isdisabled) {
			$.invalid('@(Account is disabled)');
			return;
		}

		if (profile.isinactive) {
			$.invalid('@(Account is inactive)');
			return;
		}

		if (!profile.isconfirmed)
			await DATA.modify('op.tbl_user', { isconfirmed: true }).id(profile.id).promise($);

		MAIN.auth.login($, profile.id, () => $.redirect('/' + (profile.isconfirmed && profile.isreset ? '?reset=1' : '?welcome=1')));
	}
});

NEWACTION('Account/logout', {
	name: 'Sign out',
	publish: 'id,name,sessionid',
	action: function($) {
		$.publish($.user);
		MAIN.auth.logout($, () => $.redirect('/'));
	}
});

NEWACTION('Account/notifications', {
	name: 'Read all notifications',
	action: function($) {
		var userid = $.user.id;

		DATA.find('op.tbl_notification').fields('id,appid,name,icon,path,body,color,isread,dtcreated').where('userid', userid).sort('dtcreated', true).take(50).callback($);

		if ($.user.unread) {
			userid = PG_ESCAPE(userid);
			DATA.query('UPDATE op.tbl_notification SET isread=TRUE WHERE userid={0} AND isread=FALSE'.format(userid));
			DATA.query('UPDATE op.tbl_user SET unread=0, dtnotified=NULL WHERE id={0} AND unread>0'.format(userid));
		}

	}
});

NEWACTION('Account/notifications_clear', {
	name: 'Clear all notifications',
	action: function($) {
		DATA.query('DELETE FROM op.tbl_notification WHERE userid=' + PG_ESCAPE($.user.id));
		MAIN.auth.update($.user.id, user => user.unread = 0);
		$.success();
	}
});

NEWACTION('Account/sessions', {
	name: 'Read user open sessions',
	action: async function($) {
		var items = await DATA.find('op.tbl_session').where('userid', $.user.id).sort('dtcreated', true).promise($);
		for (var item of items)
			item.current = item.id === $.sessionid;
		$.callback(items);
	}
});

NEWACTION('Account/sessions_remove', {
	name: 'Remove session',
	params: '*id:String',
	action: function($) {
		var params = $.params;
		DATA.remove('op.tbl_session').id(params.id).where('userid', $.user.id).error('@(Session not found)').callback($.done());
		MAIN.auth.refresh($.user.id);
	}
});

NEWACTION('Account/password', {
	name: 'Change password',
	input: 'oldpassword:String, *password:String',
	publish: 'id,name,email',
	action: async function($, model) {

		var user = $.user;

		if (!user.isreset && !model.oldpassword) {
			$.invalid('@(You must enter old password)');
			return;
		}

		if (!user.isreset)
			await DATA.read('op.tbl_user').fields('id').id(user.id).where('password', model.oldpassword.sha256(CONF.salt)).error('@(Invalid old password)').promise($);

		await DATA.modify('op.tbl_user', { dtpassword: NOW, password: model.password.sha256(CONF.salt) }).id(user.id).promise($);

		$.publish($.user);
		$.success();
	}
});

NEWACTION('Account/feedback', {
	name: 'Create a feedback',
	input: 'appid:UID, rating:Number, *body:String',
	publish: '+ip,userid,appid,app,email,account,ua,dtcreated:Date',
	action: async function($, model) {

		model.id = UID();
		model.userid = $.user.id;
		model.dtcreated = NOW;
		model.ua = $.ua;
		model.ip = $.ip;

		var user = await DATA.read('op.tbl_user').fields('name,email,reference').id($.user.id).promise($);
		var app = model.appid ? await DATA.read('op.tbl_app').fields('name').id(model.appid).promise($) : null;

		model.email = user.email;
		model.account = user.name;
		model.app = app ? app.name : '';

		await DATA.insert('op.tbl_feedback', model).promise($);

		var admin = await DATA.find('op.tbl_user').fields('email,language').where('sa=TRUE AND isremoved=FALSE AND isconfirmed=TRUE AND isinactive=FALSE AND isdisabled=FALSE').promise($);

		if (CONF.ismail) {
			for (var m of admin)
				MAIL(m.email, '@(Feedback)', 'mail/feedback', model, NOOP, m.language || CONF.language || '').reply(user.email);
		}

		$.publish(model);
		$.success();
	}
});