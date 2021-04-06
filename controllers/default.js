exports.install = function() {

	ROUTE('+GET  /', index);
	ROUTE('+GET  /admin/');
	ROUTE('+GET  /welcome/');

	ROUTE('GET /*', login, ['unauthorize']);
	ROUTE('+GET /marketplace/');
	ROUTE('+GET /logout/', logout);
	ROUTE('+GET /lock/', lock);
	ROUTE('+GET /_intro/', 'intro');
	ROUTE('+GET /_profile/', 'profile');
	ROUTE('+GET /access/{token}/', accesstoken);

	ROUTE('+GET /oauth/authorize/', oauthauthorize);
	ROUTE('POST /oauth/token/', oauthsession);
	ROUTE('GET  /oauth/profile/', oauthprofile);
	ROUTE('GET  /oauth/sync/', oauthsync);

	FILE('/manifest.json', manifest);
	ROUTE('#404', process404);
};

function index() {
	var self = this;
	var desktop = self.user.desktop;
	self.view(desktop === 3 ? 'portal' : desktop === 2 ? 'tabbed' : 'windowed');
	if (self.user.welcome)
		self.user.welcome = false;
}

function manifest(req, res) {
	var meta = {};
	meta.name = CONF.name;
	meta.short_name = CONF.name;
	meta.icons = [{ src: '/icon.png', size: '500x500', type: 'image/png' }];
	meta.start_url = '/';
	meta.display = 'standalone';
	res.json(meta);
}

function oauthsync() {
	var self = this;
	var data = {};
	data.code = self.query.code;
	data.client_id = CONF.oauthkey;
	data.client_secret = CONF.oauthsecret;
	data.redirect_uri = CONF.url + '/oauth/sync/';
	RESTBuilder.POST(CONF.oauthopenplatform + '/oauth/token/', data).callback(function(err, response) {

		if (err) {
			self.invalid(err);
			return;
		}

		if (!response || !response.access_token) {
			self.invalid('error-oauthsync');
			return;
		}

		RESTBuilder.GET(CONF.oauthopenplatform + '/oauth/profile/').header('Authorization', 'Bearer ' + response.access_token).callback(function(err, response) {

			if (err) {
				$.invalid(err);
				return;
			}

			if (!response || !response.id) {
				self.invalid('error-oauthsync');
				return;
			}

			if (!response.email) {
				self.invalid('error-oauthfields');
				return;
			}

			// Synchronize profile
			DBMS().one('tbl_user').where('oauth2', response.id).fields('id,photo').callback(function(err, user) {

				var options = { internal: true };
				var groups = [];

				for (var i = 0; i < response.groups.length; i++) {
					if (!MAIN.groupscache[response.groups[i]])
						groups.push(response.groups[i]);
				}

				// Download photo
				if ((!user || response.photo !== user.photo) && response.photo) {
					var path = FUNC.uploadir('photos');
					PATH.mkdir(path);
					DOWNLOAD(CONF.oauthopenplatform + '/photos/' + response.photo, PATH.join(path, response.photo), NOOP);
				}

				response.checksum = 'oauth2';
				response.oauth2 = response.id;

				// Makes new groups
				groups.wait(function(group, next) {

					$PATCH('Users/Groups', { id: group, name: group, note: 'Imported from ' + CONF.oauthopenplatform, apps: [] }, function(err) {
						if (err) {
							groups = null;
							self.invalid('error', 'OAuth Sync Error (1):' + err);
							next = null;
						} else
							next();
					});

				}, function() {
					if (user) {
						response.rebuildtoken = true;
						delete response.desktop;
						delete response.sounds;
						delete response.notifications;
						delete response.notificationsemail;
						delete response.notificationsphone;
						delete response.darkmode;
						delete response.volume;
						delete response.language;
						delete response.dateformat;
						delete response.timeformat;
						delete response.numberformat;
						delete response.statusid;
						delete response.status;
						delete response.id;

						options.keys = Object.keys(response);
						options.id = user.id;

						$PATCH('Users', response, options, function(err) {
							if (err)
								self.invalid('error', 'OAuth Sync Error (2):' + err);
							else
								FUNC.loginid(self, user.id, () => self.redirect('/'), 'OAuth 2.0 login: ' + self.ua);
						}, self);

					} else {
						response.id = UID();
						response.previd = response.id;
						$INSERT('Users', response, options, function(err) {
							if (err)
								self.invalid('error', 'OAuth Sync Error (3):' + err);
							else
								FUNC.loginid(self, response.id, () => self.redirect('/'), 'OAuth 2.0 login: ' + self.ua);
						});
					}
				});

			});
		});

	});
}

function oauthauthorize() {
	var self = this;

	if (!CONF.allowoauth) {
		self.invalid('error-nooauth');
		return;
	}

	var url = self.query.redirect_uri || '';
	var id = self.query.client_id || '';

	if (!url || !id) {
		self.invalid('error-data');
		return;
	}

	DBMS().one('tbl_oauth').fields('id').id(id).query('blocked=FALSE').error('error-invalid-clientkey').callback(function(err) {
		if (err)
			self.invalid(err);
		else
			self.redirect(url + '?code=' + self.sessionid.encrypt_uid(CONF.hashsalt));
	});
}

function oauthsession() {

	var self = this;

	if (!CONF.allowoauth) {
		self.invalid('error-nooauth');
		return;
	}

	var filter = CONVERT(self.body, 'code:String,client_id:String,client_secret:String');
	var code = filter.code.decrypt_uid(CONF.hashsalt);

	if (!code) {
		self.invalid('error-invalid-accesstoken');
		return;
	}

	var db = DBMS();
	db.one('tbl_user_session').fields('userid,dtexpire').id(code).where('dtexpire<=NOW()').set('session');
	db.err('error-invalid-accesstoken');
	db.one('tbl_oauth').fields('name').id(filter.client_id).where('accesstoken', filter.client_secret);
	db.err('error-invalid-accesstoken');
	db.callback(function(err, response) {
		if (response) {
			var data = { code: filter.code, userid: response.session.userid, id: filter.client_id };
			var accesstoken = ENCRYPT(data, CONF.hashsalt);
			self.json({ access_token: accesstoken, expire: response.session.dtexpire });
		} else
			self.invalid(err);
	});
}

var usage_oauth_insert = function(doc, params) {
	doc.id = params.id;
	doc.oauthid = params.oauthid;
	doc.date = NOW;
};

function oauthprofile() {

	var self = this;

	if (!CONF.allowoauth) {
		self.invalid('error-nooauth');
		return;
	}

	var token = (self.headers.authorization || '').split(' ')[1];
	if (!token) {
		self.invalid('error-invalid-accesstoken');
		return;
	}

	var data = DECRYPT(token, CONF.hashsalt);

	if (!data) {
		self.invalid('error-invalid-accesstoken');
		return;
	}

	var db = DBMS();
	db.one('tbl_oauth').id(data.id).fields('allowreadprofile').query('blocked=FALSE').set('oauth');
	db.err('error-invalid-accesstoken');
	db.one('tbl_user').id(data.userid).fields('id,supervisorid,deputyid,groupid,directory,directoryid,statusid,status,photo,name,linker,dateformat,timeformat,numberformat,firstname,lastname,gender,email,phone,company,language,reference,locality,position,colorscheme,repo,roles,groups,inactive,blocked,notifications,notificationsemail,notificationsphone,sa,darkmode,inactive,sounds,dtbirth,dtbeg,dtend,dtupdated,dtmodified,dtcreated,middlename,contractid,ou,desktop').set('user');
	db.err('error-invalid-accesstoken');
	db.callback(function(err, response) {

		if (err) {
			self.invalid(err);
			return;
		}

		var user = response.user;

		if (user.inactive) {
			self.invalid('error-inactive');
			return;
		}

		if (user.blocked) {
			self.invalid('error-blocked');
			return;
		}

		var usage = {};
		var usageid = NOW.format('yyyyMMdd') + data.id;

		usage['+count'] = 1;
		usage['+' + (user.mobile ? 'mobile' : 'desktop')] = 1;
		usage['+' + (user.desktop === 1 ? 'windowed' : user.desktop === 2 ? 'tabbed' : 'desktop')] = 1;
		usage['+' + (user.darkmode === 1 ? 'darkmode' : 'lightmode')] = 1;
		usage.dtupdated = NOW;

		var db = DBMS();
		db.mod('tbl_usage_oauth', usage, true).id(usageid).insert(usage_oauth_insert, { id: usageid, oauthid: data.id });
		db.mod('tbl_oauth', { dtused: NOW }).id(data.id);

		user.blocked = undefined;
		user.inactive = undefined;

		if (response.oauth.allowreadprofile !== 2) {
			user.email = undefined;
			user.phone = undefined;
			user.repo = undefined;
			user.dtbirth = undefined;
		}

		self.json(user);
	});
}

function accesstoken(token) {

	if (!CONF.allowaccesstoken) {
		self.invalid('error-noaccesstoken');
		return;
	}

	var app = MAIN.apps.findItem('accesstoken', token);
	var self = this;
	if (!app) {
		self.throw401();
		return;
	}

	var url = self.query.url || app.frame;
	self.id = app.id;

	$WORKFLOW('Apps', 'run', function(err, response) {

		var builder = [];
		builder.push('openplatform=' + encodeURIComponent(response.verify));

		if (response.rev)
			builder.push('rev=' + response.rev);

		if (self.user.language)
			builder.push('language=' + self.user.language);

		var index = url.indexOf('?');
		if (index === -1)
			url += '?';
		else
			url += '&';

		self.redirect(url + builder.join('&'));

	}, self);
}

function login() {

	var self = this;

	if (CONF.language)
		self.language = CONF.language;

	if (self.req.locked) {
		// locked
		self.view('locked');
		return;
	}

	if (CONF.oauthopenplatform && CONF.oauthkey && CONF.oauthsecret) {
		self.redirect(CONF.oauthopenplatform + '/oauth/authorize/?client_id=' + CONF.oauthkey + '&redirect_uri=' + encodeURIComponent(CONF.url + '/oauth/sync/'));
		return;
	}

	if (self.query.token) {
		var data = DECRYPT(self.query.token, CONF.secretpassword);
		if (data && data.date && data.date.add('2 days') > NOW) {
			FUNC.cookie(self, data.id, null, function() {
				self.redirect(self.url + (data.type === 'password' ? '?password=1' : '?welcome=1'));
			}, (self.headers['user-agent'] || '').parseUA() + ' ({0})'.format(self.ip));
			return;
		}
	}

	if (self.url !== '/')
		self.status = 401;

	self.view('login');
}

function logout() {
	var self = this;
	if (self.user)
		FUNC.logout(self);
	else
		self.redirect('/');
}

function lock() {
	var self = this;
	var db = DBMS();
	db.modify('tbl_user_session', { locked: true }).id(self.sessionid);
	self.ID = 'Lock';
	db.log(self);
	self.user.locked = true;
	self.redirect('/');
}

function process404() {

	var self = this;

	if (self.url.indexOf('/photos/') !== -1 && self.url.lastIndexOf('.jpg') !== -1) {
		self.file('/img/photo.jpg');
		return;
	}

	self.status = 404;
	self.plain('404: The resource not found');
}