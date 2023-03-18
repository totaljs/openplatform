exports.install = function() {

	ROUTE('+GET    /logout/  *Account   --> logout');
	ROUTE('-GET    /auth/    *Account   --> token');

	ROUTE('+API    /api/    -session                 *Account   --> session');
	ROUTE('+API    /api/    -account                 *Account   --> read');
	ROUTE('+API    /api/    +account_update          *Account   --> update');
	ROUTE('+API    /api/    -run/{appid}             *Account   --> run');
	ROUTE('+API    /api/    -apps                    *Account   --> apps');
	ROUTE('+API    /api/    +reorder                 *Account   --> reorder');
	ROUTE('+API    /api/    -notifications           *Account   --> notifications');
	ROUTE('+API    /api/    -notifications_clear     *Account   --> notifications_clear');
	ROUTE('+API    /api/    -sessions                *Account   --> sessions');
	ROUTE('+API    /api/    -sessions_remove/{id}    *Account   --> sessions_remove');
	ROUTE('+API    /api/    +password                *Account   --> password');
	ROUTE('+API    /api/    +feedback                *Account   --> feedback');

	ROUTE('GET     /users/', users);

	ROUTE('POST    /upload/base64/', upload, 1024 * 2);
	ROUTE('FILE    /files/*.jpg', files);
};

async function upload() {

	var $ = this;

	if (BLOCKED($, 20)) {
		$.invalid(401);
		return;
	}

	if (!$.user && $.query.token !== CONF.servicetoken) {
		$.invalid(401);
		return;
	}

	BLOCKED($, null);

	var name = $.body.filename || $.body.name;
	if (!name) {
		$.invalid('Invalid file name');
		return;
	}

	var type = $.body.file.base64ContentType();
	if (!type || type !== 'image/jpeg') {
		$.invalid('Invalid file type');
		return;
	}

	var buffer = $.body.file.base64ToBuffer();
	if (!buffer) {
		$.invalid('Invalid file data');
		return;
	}

	var id = UID();
	await FILESTORAGE('files').save(id, 'base64.jpg', buffer);
	$.json('/files/' + FUNC.checksum(id) + '.jpg');
}

function files(req, res) {

	if (req.split.length !== 2) {
		res.throw404();
		return;
	}

	var id = req.split[1];

	id = id.substring(0, id.lastIndexOf('.'));
	var arr = id.split('X');

	if (FUNC.checksum(arr[0]) === id)
		res.filefs('files', arr[0]);
	else
		res.throw404();

}

function users() {

	var $ = this;

	if (!CONF.allow_token || !CONF.token) {
		$.invalid('Public API is disabled');
		return;
	}

	if (BLOCKED($, 20)) {
		$.invalid(401);
		return;
	}

	if ($.headers['x-token'] !== CONF.token) {
		$.invalid(401);
		return;
	}

	BLOCKED($, null);

	var db = DB();

	db.query('SELECT a.id,a.name,a.icon,a.color FROM op.tbl_group a').set('groups');
	db.query('SELECT a.id,a.reference,a.language,a.gender,a.photo,a.name,a.search,a.email,a.color,a.interface,a.sounds,a.notifications,a.sa,a.isdisabled,a.isinactive,a.isonline,a.dtlogged,a.dtcreated,a.dtupdated,ARRAY(SELECT x.groupid FROM op.tbl_user_group x WHERE x.userid=a.id) AS groups FROM op.tbl_user a WHERE a.isremoved=FALSE ORDER BY dtcreated ASC').set('users');

	db.callback($.successful(function(response) {
		for (var m of response.users) {
			if (m.photo)
				m.photo = CONF.url + m.photo;
		}
		$.json(response);
	}));
}