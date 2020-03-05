NEWSCHEMA('Dashboard', function(schema) {

	schema.setRead(function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().query('SELECT date_part(\'year\', date) as year FROM tbl_usage GROUP BY 1 ORDER BY 1 DESC').callback($.callback);
	});

	schema.addWorkflow('online', function($) {
		var date = NOW;
		var db = DBMS();
		db.one('tbl_usage').where('date', date);
		db.all('tbl_usage_app').where('date', date).set('apps').sort('count', true);
		db.all('tbl_usage_browser').where('date', date).set('browsers').sort('count', true);
		db.all('tbl_user').fields('name,position,dtlogged').take(10).query('dtlogged IS NOT NULL').sort('dtlogged', true).set('users');
		db.callback(function(err, response) {

			MAIN.session.count(function(err, counter) {
				response.memory = process.memoryUsage();
				response.performance = F.stats.performance;
				response.sessions = counter;
				$.callback(response);
			});

		});
	});

	schema.addWorkflow('yearly', function($) {
		var db = DBMS();
		var year = ($.id ? +$.id : NOW.getFullYear());
		db.query(`WITH months AS (SELECT date_part('month', date) as month FROM tbl_usage WHERE date_part('year', date)={0} GROUP BY 1) SELECT month, (SELECT ARRAY[SUM(logged)::int4, MAX(mobile)::int4, SUM(desktop)::int4, MAX(maxonline)::int4, SUM(windowed)::int4, SUM(portal)::int4, SUM(tabbed)::int4, SUM(lightmode)::int4, SUM(darkmode)::int4] FROM tbl_usage WHERE date_part('month', date)=month) as stats FROM months`.format(year)).set('usage');
		db.query(`SELECT appid, SUM(count)::int4 as count FROM tbl_usage_app WHERE date_part('year', date)={0} GROUP BY appid ORDER BY 2 DESC LIMIT 50`.format(year)).set('apps');
		db.query(`SELECT name, SUM(count)::int4 as count FROM tbl_usage_browser WHERE date_part('year', date)={0} GROUP BY name ORDER BY 2 DESC LIMIT 50`.format(year)).set('browsers');
		// db.query(`WITH months AS (SELECT appid, date_part('month', date) as month FROM tbl_usage_app WHERE date_part('year', date)={0} GROUP BY 1, 2) SELECT appid, month, (SELECT ARRAY[SUM(logged)::int4, MAX(mobile)::int4, SUM(desktop)::int4, MAX(maxonline)::int4, SUM(windowed)::int4, SUM(portal)::int4, SUM(tabbed)::int4, SUM(lightmode)::int4, SUM(darkmode)::int4] FROM tbl_usage WHERE date_part('month', date)=month) as stats FROM months`.format(year)).set('apps');
		// db.query(`WITH months AS (SELECT name, date_part('month', date) as month FROM tbl_usage_browser WHERE date_part('year', date)={0} GROUP BY 1, 2) SELECT name, month, (SELECT ARRAY[SUM(logged)::int4, MAX(mobile)::int4, SUM(desktop)::int4, MAX(maxonline)::int4, SUM(windowed)::int4, SUM(portal)::int4, SUM(tabbed)::int4, SUM(lightmode)::int4, SUM(darkmode)::int4] FROM tbl_usage WHERE date_part('month', date)=month) as stats FROM months`.format(year)).set('browsers');
		db.callback($.callback);
	});

});