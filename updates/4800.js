var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=\'cl_component\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.query('ALTER TABLE tbl_app ADD typeid VARCHAR(10)');
	db.query('UPDATE tbl_app SET typeid=\'external\'');
	db.query('UPDATE cl_config SET value=\'https://marketplace.totaljs.com/openplatform/\' WHERE id=\'marketplace\'');

	db.query(`CREATE TABLE "public"."tbl_app_source" (
	"id" varchar(25) NOT NULL,
	"appid" varchar(25),
	"type" varchar(10),
	"name" varchar(50),
	"icon" varchar(30),
	"color" varchar(7),
	"properties" json,
	"url" json,
	"static" bool DEFAULT false,
	"local" bool DEFAULT false,
	"isremoved" bool DEFAULT false,
	"dtcreated" timestamp DEFAULT now(),
	"dtupdated" timestamp,
	CONSTRAINT "tbl_app_source_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);`);

	db.query(`CREATE TABLE "public"."tbl_app_source_bk" (
	"id" serial,
	"appid" varchar(25),
	"uid" varchar(25),
	"userid" varchar(25),
	"type" varchar(10),
	"name" varchar(50),
	"icon" varchar(30),
	"color" varchar(7),
	"properties" json,
	"url" json,
	"static" bool DEFAULT false,
	"local" bool DEFAULT false,
	"isremoved" bool DEFAULT false,
	"dtcreated" timestamp DEFAULT now(),
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);`);

	db.query(`CREATE TABLE "public"."tbl_app_ui" (
	"id" varchar(40) NOT NULL,
	"appid" varchar(25),
	"sourceid" varchar(25),
	"type" varchar(20),
	"icon" varchar(30),
	"color" varchar(7),
	"name" varchar(50),
	"design" text,
	"settings" json,
	"changelog" varchar(100),
	"isnavigation" bool DEFAULT false,
	"onchange" text,
	"onvalidate" text,
	"onload" text,
	"onsubmit" text,
	"position" int2 DEFAULT 0,
	"dtcreated" timestamp DEFAULT now(),
	"dtupdated" timestamp,
	"isremoved" bool DEFAULT false,
	CONSTRAINT "tbl_app_ui_sourceid_fkey" FOREIGN KEY ("sourceid") REFERENCES "public"."tbl_app_source"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_app_ui_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);`);

	db.query(`CREATE TABLE "public"."tbl_app_ui_bk" (
	"id" serial,
	"uid" varchar(40),
	"appid" varchar(25),
	"userid" varchar(25),
	"sourceid" varchar(25),
	"type" varchar(20),
	"icon" varchar(30),
	"color" varchar(7),
	"name" varchar(50),
	"changelog" varchar(100),
	"design" text,
	"settings" json,
	"onchange" text,
	"onvalidate" text,
	"onload" text,
	"onsubmit" text,
	"dtcreated" timestamp DEFAULT now(),
	PRIMARY KEY ("id")
);`);

	db.query(`CREATE TABLE "public"."cl_component" (
	"id" varchar(100) NOT NULL,
	"dtcreated" timestamp DEFAULT now(),
	PRIMARY KEY ("id")
);`);

});

db.callback($.done());