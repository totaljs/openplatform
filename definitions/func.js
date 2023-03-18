FUNC.checksum = function(val) {
	return val + 'X' + val.makeid(CONF.saltchecksum);
};

FUNC.permissions = async function(userid, callback) {

	var db = DB();
	var user = await db.read('op.tbl_user').fields('cache').id(userid).promise();

	if (user && user.cache) {
		callback(user.cache);
		return;
	}

	var groups = await db.query('SELECT a.id FROM op.tbl_group a WHERE a.isdisabled=FALSE AND a.id IN (SELECT b.groupid FROM op.tbl_user_group b WHERE b.userid={0})'.format(PG_ESCAPE(userid))).promise();
	var apermissions = await db.find('op.tbl_group_permission').fields('permissionid,appid').in('groupid', groups, 'id').promise();
	var allowed = [];
	var cache = {};

	for (let m of apermissions) {
		if (m.permissionid)
			allowed.push(m);
		else if (!cache[m.appid])
			cache[m.appid] = [];
	}

	var permissions = EMPTYARRAY;

	if (allowed.length)
		permissions = await db.find('op.tbl_app_permission').fields('id,appid,value').in('id', allowed, 'permissionid').query('appid IN (SELECT x.id FROM op.tbl_app x WHERE x.isremoved=FALSE AND x.isdisabled=FALSE)').promise();

	for (let m of permissions) {

		if (!cache[m.appid])
			cache[m.appid] = [];

		if (m.value)
			cache[m.appid].push(m.value);

	}

	var apps = Object.keys(cache);
	var data = {};

	data.apps = apps;
	data.permissions = cache;
	data.groups = [];

	for (var m of groups)
		data.groups.push(m.id);

	var filter = [];

	for (let m of groups)
		filter.push('G' + m.id);

	for (let m of apps)
		filter.push('A' + m);

	await db.modify('op.tbl_user', { cache: JSON.stringify(data), cachefilter: filter }).id(userid).promise();
	callback(data);
};

FUNC.clearcache = function(id) {
	FUNC.clearcacheinternal();
	DB().query('UPDATE op.tbl_user SET cache=null, cachefilter=null WHERE {0}=ANY(cachefilter)'.format(PG_ESCAPE(id)));
};

FUNC.clearcacheinternal = function() {
	MAIN.cache = {};
};

FUNC.makenotify = function(app, userid) {
	var obj = {};
	var token = FUNC.checksum(userid + app.id + 'X' + CONF.id);
	obj.notify = CONF.url + '/notify/?token=' + token;
	obj.notifytoken = obj.notify.md5(app.reqtoken).md5(app.restoken);
	return obj;
};