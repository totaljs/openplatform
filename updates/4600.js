var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=\'cl_config\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.query('CREATE TABLE "public"."tbl_oauth" ("id" varchar(25) NOT NULL, "accesstoken" varchar(50), "name" varchar(40), "url" varchar(500), "icon" varchar(30), "version" varchar(20), "allowreadprofile" int2 DEFAULT 0, "allowreadapps" int2 DEFAULT 0, "allowreadusers" int2 DEFAULT 0, "allowreadmeta" int2 DEFAULT 0, "blocked" bool DEFAULT false, "dtused" timestamp, "dtcreated" timestamp, "dtupdated" timestamp, PRIMARY KEY ("id"));');
	db.query('CREATE TABLE "public"."cl_config" ("id" varchar(30) NOT NULL, "type" varchar(10), "value" text, "name" varchar(50), "dtcreated" timestamp, "dtupdated" timestamp, PRIMARY KEY ("id"));');
	db.query('CREATE TABLE "public"."tbl_usage_oauth" ("id" varchar(35) NOT NULL, "oauthid" varchar(25), "count" int4 DEFAULT 0, "mobile" int4 DEFAULT 0, "desktop" int4 DEFAULT 0, "windowed" int4 DEFAULT 0, "tabbed" int4 DEFAULT 0, "portal" int4 DEFAULT 0, "lightmode" int4 DEFAULT 0, "darkmode" int4 DEFAULT 0, "date" date, "dtupdated" timestamp, CONSTRAINT "tbl_usage_oauth_oauthid_fkey" FOREIGN KEY ("oauthid") REFERENCES "public"."tbl_oauth"("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("id"));');

	db.one('tbl_settings').data(function(response) {
		response = response.body;
		var keys = Object.keys(response);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var val = response[key];
			var type = typeof(val);

			if (key === 'smtpsettings')
				type = 'json';

			db.insert('cl_config', { id: key, type: type, value: val + '', name: key, dtcreated: NOW });
		}
	});

});

db.callback($.done());