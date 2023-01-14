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