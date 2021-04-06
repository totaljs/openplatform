var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.columns WHERE table_name=\'tbl_user_report\' and column_name=\'useremail\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.insert('cl_config', { id: 'language', type: 'string', value: 'en', name: 'language', dtcreated: NOW });
	db.insert('cl_config', { id: 'dateformat', type: 'string', value: 'yyyy-MM-dd', name: 'dateformat', dtcreated: NOW });
	db.insert('cl_config', { id: 'timeformat', type: 'number', value: '24', name: 'timeformat', dtcreated: NOW });
	db.insert('cl_config', { id: 'numberformat', type: 'number', value: '1', name: 'numberformat', dtcreated: NOW });
	db.insert('cl_config', { id: 'desktop', type: 'number', value: '3', name: 'desktop', dtcreated: NOW });

	db.query('DROP VIEW view_user_report');
	db.query('DROP TABLE tbl_user_report');
	db.query(`CREATE TABLE "public"."tbl_user_report" (
		"id" varchar(25) NOT NULL,
		"userid" varchar(25),
		"appid" varchar(25),
		"type" varchar(30),
		"subject" varchar(100),
		"body" text,
		"ip" cidr,
		"username" varchar(50),
		"useremail" varchar(120),
		"userphoto" varchar(80),
		"userposition" varchar(40),
		"appname" varchar(50),
		"appicon" varchar(30),
		"screenshot" boolean DEFAULT false,
		"solved" bool DEFAULT false,
		"priority" bool DEFAULT false,
		"dtsolved" timestamp,
		"dtcreated" timestamp DEFAULT now(),
		PRIMARY KEY ("id")
	);`);

});

db.callback($.done());