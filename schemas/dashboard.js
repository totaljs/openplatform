NEWSCHEMA('Dashboard', function(schema) {

	schema.setRead(function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().query('SELECT date_part(\'year\', date) as year FROM tbl_usage GROUP BY 1 ORDER BY 1 DESC').callback($.callback);
	});

	schema.addWorkflow('online', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var date = NOW;
		var db = DBMS();

		db.one('tbl_usage').where('date', date);
		db.que('SELECT id,appid,count,mobile,desktop,windowed,tabbed,portal,lightmode,darkmode,date,dtupdated,(SELECT COUNT(1)::int4 as count FROM tbl_user WHERE online=TRUE AND running && ARRAY[appid]) AS running FROM tbl_usage_app WHERE date=$1', [date]).set('apps').sort('count', true);
		db.all('tbl_usage_browser').where('date', date).set('browsers').sort('count', true);
		db.all('tbl_user').fields('id,name,position,dtlogged').take(10).query('dtlogged IS NOT NULL').sort('dtlogged', true).set('users');
		db.que('SELECT (SELECT COUNT(1)::int4 FROM tbl_user_session WHERE online=TRUE) as used, (SELECT COUNT(1)::int4 FROM tbl_user_session WHERE online=FALSE) as free').first().set('sessions');
		db.callback(function(err, response) {
			response.version = MAIN.version;
			response.memory = process.memoryUsage();
			response.performance = F.stats.performance;
			response.sessions.count = response.sessions.used + response.sessions.free;
			$.callback(response);
		});
	});

	schema.addWorkflow('total', function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().que('SELECT SUM(logged)::int4 as visitors, MAX(maxonline) as maxonline FROM tbl_usage').first().callback($.callback);
	});

	schema.addWorkflow('yearly', function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		var db = DBMS();
		var year = ($.id ? +$.id : NOW.getFullYear());
		db.query(`WITH months AS (SELECT date_part('month', date) as month FROM tbl_usage WHERE date_part('year', date)={0} GROUP BY 1) SELECT month, (SELECT ARRAY[SUM(logged)::int4, SUM(mobile)::int4, SUM(desktop)::int4, MAX(maxonline)::int4, SUM(windowed)::int4, SUM(portal)::int4, SUM(tabbed)::int4, SUM(lightmode)::int4, SUM(darkmode)::int4] FROM tbl_usage WHERE date_part('month', date)=month) as stats FROM months`.format(year)).set('usage');
		db.query(`SELECT appid, SUM(count)::int4 as count FROM tbl_usage_app WHERE date_part('year', date)={0} GROUP BY appid ORDER BY 2 DESC LIMIT 50`.format(year)).set('apps');
		db.query(`SELECT name, SUM(count)::int4 as count FROM tbl_usage_browser WHERE date_part('year', date)={0} GROUP BY name ORDER BY 2 DESC LIMIT 50`.format(year)).set('browsers');
		db.callback($.callback);
	});

});