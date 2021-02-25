var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=\'cl_component\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.query('ALTER TABLE tbl_app ADD typeid VARCHAR(10)');
	db.query('ALTER TABLE tbl_user ADD oauth2 VARCHAR(25)');
	db.query('ALTER TABLE tbl_log ADD data JSON');
	db.query('UPDATE tbl_app SET typeid=\'external\'');
	db.query('UPDATE cl_config SET value=\'https://marketplace.openplatform.cloud\' WHERE id=\'marketplace\'');

	db.query(`CREATE OR REPLACE VIEW view_user AS
	SELECT a.id,
		a.supervisorid,
		a.deputyid,
		a.groupid,
		a.directory,
		a.directoryid,
		a.statusid,
		a.status,
		a.photo,
		a.name,
		a.linker,
		a.search,
		a.note,
		a.firstname,
		a.lastname,
		a.middlename,
		a.gender,
		a.email,
		a.phone,
		a.company,
		a.locking,
		a.pin,
		a.ou,
		a.language,
		a.reference,
		a.locality,
		a."position",
		a.roles,
		a.groups,
		a.blocked,
		a.customer,
		a.notifications,
		a.notificationsemail,
		a.notificationsphone,
		a.sa,
		a.inactive,
		a.online,
		a.countsessions,
		a.countbadges,
		a.countnotifications,
		a.otp,
		a.sounds,
		a.contractid,
		a.colorscheme,
		a.darkmode,
		a.background,
		a.desktop,
		a.dateformat,
		a.timeformat,
		a.numberformat,
		a.running,
		a.dtbirth,
		a.dtbeg,
		a.dtend,
		a.dtupdated,
		a.dtcreated,
		a.dtlogged,
		a.dtmodified,
		CASE WHEN (length(a.deputyid) > 0) THEN (SELECT b.name FROM tbl_user b WHERE b.id = a.deputyid LIMIT 1) ELSE ''::text END AS deputy,
		CASE WHEN (length(a.supervisorid) > 0) THEN (SELECT c.name FROM tbl_user c WHERE c.id=a.supervisorid LIMIT 1) ELSE ''::text END AS supervisor,
		a.oauth2
	FROM tbl_user a`);

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
	CONSTRAINT "tbl_app_ui_sourceid_fkey" FOREIGN KEY ("sourceid") REFERENCES "public"."tbl_app_source"("id") ON DELETE CASCADE ON UPDATE SET NULL,
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

	db.query(`INSERT INTO "public"."cl_component" ("id") VALUES('https://cdn.componentator.com/designer/components.json')`);
});

db.callback($.done());