const COOKIE = '__op';
const SESSION = {};
const HEADERS = {};
const FLAGS_READ = ['get', 'dnscache'];
const FLAGS_POST = ['post', 'json', 'dnscache'];
const EMPTYARRAY = [];
const EMPTYOBJECT = {};
const OPENPLATFORM = {};

OPENPLATFORM.debug = F.config['openplatform.debug'] == true;

global.OPENPLATFORM = OPENPLATFORM;

F.route('/openplatform/', function() {
	var self = this;
	OPENPLATFORM.authorize(self.req, self.res, function(err) {

		if (err) {
			F.logger('openplatform-errors', err);
			self.status = 400;
			return self.content(OPENPLATFORM.kill(), 'text/html');
		}

		self.plain('success');
	});
});

HEADERS['x-openplatform-id'] = F.config['openplatform.url'];

if (F.config['openplatform.secret'])
	HEADERS['x-openplatform-secret'] = F.config['openplatform.secret'];

OPENPLATFORM.testuser = function(roles, settings) {
	var item = {};
	item.id = '1234567890';
	item.alias = 'Peter Sirka';
	item.firstname = 'Peter';
	item.lastname = 'Sirka';
	item.photo = '//openplatform.totaljs.com/photos/petersirka_gmail_com.jpg';
	item.email = 'petersirka@gmail.com';
	item.phone = '+421903163302';
	item.online = true;
	item.blocked = false;
	item.group = 'Developers';
	item.superadmin = true;
	item.notifications = true;
	item.dateupdated = F.datetime;
	item.roles = roles || [];
	item.settings = settings;
	item.sounds = true;
	item.language = 'en';
	item.openplatform = { name: 'OpenPlatform', version: '1.0.0', url: 'http://openplatform.totaljs.com' };
	return item;
};

OPENPLATFORM.kill = function() {
	return 'OpenPlatform: <b>401: Unauthorized</b><script>var data={};data.openplatform=true;data.type=\'kill\';data.body=null;data.sender=true;setTimeout(function(){top.postMessage(JSON.stringify(data),\'*\');},1000);</script>';
};

OPENPLATFORM.clientside = function() {
	return '<script>var OPENPLATFORM={};OPENPLATFORM.version="1.0.0",OPENPLATFORM.callbacks={},OPENPLATFORM.events={},OPENPLATFORM.is=top!==window,OPENPLATFORM.verify=function(n){if(n||(n=function(n){n!==!0&&(document.body.innerHTML="401: Unauthorized",setTimeout(function(){window.close()},2e3))}),!OPENPLATFORM.is)return void n(!1);for(var e,t=location.search.substring(1).split("&"),O=0,r=t.length;r>O;O++){var P=t[O];if("openplatform="===P.substring(0,13)){e=decodeURIComponent(P.substring(13));break}}if(e){var o=setTimeout(function(){o=null,n(!1)},1e3),i={};i.token=e,i.ua=navigator.userAgent,OPENPLATFORM.send("verify",i,function(e,t){o&&(n(t===!0),clearTimeout(o)),o=null})}else n(!1)},OPENPLATFORM.loading=function(n){return OPENPLATFORM.send("loading",n)},OPENPLATFORM.warning=function(n){return OPENPLATFORM.send("warning",n)},OPENPLATFORM.success=function(n){return OPENPLATFORM.send("success",n)},OPENPLATFORM.play=function(n){return OPENPLATFORM.send("play",n)},OPENPLATFORM.stop=function(n){return OPENPLATFORM.send("stop",n)},OPENPLATFORM.maximize=function(n){return OPENPLATFORM.send("maximize",n)},OPENPLATFORM.restart=function(){return OPENPLATFORM.send("restart",location.href)},OPENPLATFORM.open=function(n,e){return OPENPLATFORM.send("open",{id:n,message:e})},OPENPLATFORM.minimize=function(){return OPENPLATFORM.send("minimize")},OPENPLATFORM.close=function(){return OPENPLATFORM.send("kill")},OPENPLATFORM.notify=function(n,e,t){return"string"==typeof n&&(t=e,e=n,n=0),OPENPLATFORM.send("notify",{type:n,body:e,url:t||"",datecreated:new Date})},OPENPLATFORM.getProfile=function(n){return OPENPLATFORM.send("profile",n)},OPENPLATFORM.getApplications=function(n){return OPENPLATFORM.send("applications",n)},OPENPLATFORM.getUsers=function(n){return OPENPLATFORM.send("users",n)},OPENPLATFORM.getInfo=function(n){return OPENPLATFORM.send("info",n)},OPENPLATFORM.onMinimize=function(n){return OPENPLATFORM.on("minimize",n)},OPENPLATFORM.onMaximize=function(n){return OPENPLATFORM.on("maximize",n)},OPENPLATFORM.onClose=function(n){return OPENPLATFORM.on("close",n)},OPENPLATFORM.onMessage=function(n){return OPENPLATFORM.on("message",n)},OPENPLATFORM.send=function(n,e,t){"function"==typeof e&&(t=e,e=null);var O={};return O.openplatform=!0,O.type=n,O.body=e||null,O.sender=!0,top?(t&&(O.callback=(1e6*Math.random()).toString(32).replace(/\./g,""),OPENPLATFORM.callbacks[O.callback]=t),top.postMessage(JSON.stringify(O),"*"),OPENPLATFORM):void(t&&t(new Error("The application is not runned in the openplatform scope.")))},OPENPLATFORM.on=function(n,e){return OPENPLATFORM.events[n]||(OPENPLATFORM.events[n]=[]),OPENPLATFORM.events[n].push(e),OPENPLATFORM},window.addEventListener("message",function(n){try{var e=JSON.parse(n.data);if(!e.openplatform)return;if(e.callback){var t=OPENPLATFORM.callbacks[e.callback];return void(t&&(e.sender&&(e.error=new Error("The application is not runned in the openplatform scope.")),t(e.error,e.body||{}),delete OPENPLATFORM.callbacks[e.callback]))}if(e.sender)return;"kill"===e.type&&(e.type="close");var O=OPENPLATFORM.events[e.type];O&&O.forEach(function(n){n(e.body||{})})}catch(n){}},!1);</script>';
};

OPENPLATFORM.session = function(cookie) {
	// checks whether is the cookie a request object
	if (cookie.cookie)
		cookie = cookie.cookie(COOKIE);
	return SESSION[cookie];
};

OPENPLATFORM.authorize = function(req, res, callback) {

	var cookie = req.cookie(COOKIE);
	var openplatform = req.query.openplatform;

	if (!cookie && !openplatform)
		return callback(new Error('Missing the "cookie" and "openplatform" query parameter.'));

	if (!cookie)
		cookie = U.GUID(30);

	var user;

	if (!openplatform) {
		user = SESSION[cookie];
		if (user)
			return callback(null, user);
	}

	if (!openplatform)
		return callback(new Error('Missing the "openplatform" query parameter.'), null);

	U.request(openplatform, FLAGS_READ, function(err, response, code) {

		OPENPLATFORM.debug && console.log('OPENPLATFORM.authorize("{0}") -->'.format(openplatform), err, response);

		if (err || code !== 200)
			return callback(err || response.parseJSON());

		user = response.parseJSON();
		if (!user)
			return callback(new Error(response));

		SESSION[cookie] = user;
		user.expire = F.datetime.getTime() + 900000;
		res.cookie(COOKIE, cookie, '1 days', { domain: req.uri.hostname });
		callback(null, user);

	}, null, HEADERS);
};

OPENPLATFORM.getApplications = function(openplatform, iduser, callback) {

	if (typeof(openplatform) === 'object')
		openplatform = openplatform.url;

	HEADERS['x-openplatform-user'] = iduser;
	U.request(openplatform + '/api/applications/', FLAGS_READ, function(err, response, code) {

		OPENPLATFORM.debug && console.log('OPENPLATFORM.getApplications("{0}", "{1}") -->'.format(openplatform, iduser), err, response);

		if (err)
			return callback(err);

		var data = response.parseJSON();
		if (code === 200)
			callback(data, EMPTYARRAY);
		else
			callback(null, data);

	}, null, HEADERS);
	return OPENPLATFORM;
};

OPENPLATFORM.getUsers = function(openplatform, iduser, callback) {

	if (typeof(openplatform) === 'object')
		openplatform = openplatform.url;

	HEADERS['x-openplatform-user'] = iduser;
	U.request(openplatform + '/api/users/', FLAGS_READ, function(err, response, code) {

		OPENPLATFORM.debug && console.log('OPENPLATFORM.getUsers("{0}", "{1}") -->'.format(openplatform, iduser), err, response);

		if (err)
			return callback(err);

		var data = response.parseJSON();
		if (code === 200)
			callback(null, data);
		else
			callback(data, EMPTYARRAY);

	}, null, HEADERS);
	return OPENPLATFORM;
};

OPENPLATFORM.getInfo = function(openplatform, callback) {

	if (typeof(openplatform) === 'object')
		openplatform = openplatform.url;

	U.request(openplatform + '/api/openplatform/', FLAGS_READ, function(err, response, code) {

		OPENPLATFORM.debug && console.log('OPENPLATFORM.getInfo("{0}") -->'.format(openplatform), code, err, response);

		if (err)
			return callback(err);

		var data = response.parseJSON();
		if (code === 200)
			callback(null, data);
		else
			callback(data, EMPTYOBJECT);

	}, null, HEADERS);

	return OPENPLATFORM;
};

OPENPLATFORM.notify = function(openplatform, iduser, body, callback, url, type) {

	if (typeof(openplatform) === 'object')
		openplatform = openplatform.url;

	HEADERS['x-openplatform-user'] = iduser;

	var model = {};
	model.body = body;
	model.url = url;
	model.type = type;

	U.request(openplatform + '/api/notifications/', FLAGS_POST, model, function(err, response, code) {

		OPENPLATFORM.debug && console.log('OPENPLATFORM.notify("{0}", "{1}") -->'.format(openplatform, iduser), code, err, response);

		if (err)
			return callback(err);

		var data = response.parseJSON();
		if (code === 200)
			callback(null, data);
		else
			callback(data, EMPTYOBJECT);

	}, null, HEADERS);
	return OPENPLATFORM;
};

OPENPLATFORM.serviceworker = function(openplatform, iduser, event, data, callback) {

	if (typeof(openplatform) === 'object')
		openplatform = openplatform.url;

	HEADERS['x-openplatform-user'] = iduser;

	var model = {};
	model.event = event;
	model.data = data;

	U.request(openplatform + '/api/serviceworker/', FLAGS_POST, model, function(err, response, code) {

		OPENPLATFORM.debug && console.log('OPENPLATFORM.serviceworker("{0}", "{1}") -->'.format(openplatform, iduser), code, err, response);

		if (err)
			return callback(err);

		var data = response.parseJSON();
		if (code === 200)
			callback(null, data);
		else
			callback(data, EMPTYOBJECT);

	}, null, HEADERS);

	return OPENPLATFORM;
};

F.on('service', function(interval) {

	// Each 3 minutes
	if (interval % 3 !== 0)
		return;

	var ts = F.datetime.getTime();

	Object.keys(SESSION).forEach(function(key) {
		if (SESSION[key].expire < ts)
			delete SESSION[key];
	});
});

F.middleware('openplatform', function(req, res, next) {
	OPENPLATFORM.authorize(req, res, function(user) {

		if (user) {
			user.session = F.datetime.getTime() + 900000;
			req.user = user;
			return next();
		}

		res.content(401, OPENPLATFORM.kill(), 'text/html');
		next(false);
	});
});

F.helpers.openplatform = function() {
	return OPENPLATFORM.clientside();
};

Controller.prototype.openplatform = function() {
	var req = this.req;
	var obj = {};
	obj.id = req.headers['x-openplatform-id'];
	obj.openplatform = req.headers['x-openplatform'];
	obj.user = req.headers['x-openplatform-user'];
	obj.secret = req.headers['x-openplatform-secret'];
	obj.event = this.body.event;
	obj.data = this.body.data;
	obj.empty = obj.openplatform && obj.user ? false : true;
	obj.serviceworker = obj.id && obj.event;
	return obj;
};