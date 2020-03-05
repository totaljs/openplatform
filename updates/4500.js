var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.tables WHERE table_schema=\'public\' AND table_name=\'tbl_usage\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.query('DROP TABLE tbl_user_report');
	db.query('DROP VIEW view_user');
	db.query('ALTER TABLE tbl_user ADD COLUMN running _varchar;');
	db.query('CREATE TABLE "public"."tbl_usage" ("id" varchar(10) NOT NULL,"online" int4 DEFAULT 0,"logged" int4 DEFAULT 0,"maxonline" int4 DEFAULT 0,"desktop" int4 DEFAULT 0,"mobile" int4 DEFAULT 0,"windowed" int4 DEFAULT 0,"tabbed" int4 DEFAULT 0,"portal" int4 DEFAULT 0,"lightmode" int4 DEFAULT 0,"darkmode" int4 DEFAULT 0,"date" date,"dtupdated" timestamp,PRIMARY KEY ("id"))');
	db.query('CREATE TABLE "public"."tbl_usage_app" ("id" varchar(35) NOT NULL,"appid" varchar(25),"count" int4 DEFAULT 0,"mobile" int4 DEFAULT 0,"desktop" int4 DEFAULT 0,"windowed" int4 DEFAULT 0,"tabbed" int4 DEFAULT 0,"portal" int4 DEFAULT 0,"lightmode" int4 DEFAULT 0,"darkmode" int4 DEFAULT 0,"date" date,"dtupdated" timestamp,CONSTRAINT "tbl_usage_app_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,PRIMARY KEY ("id"))');
	db.query('CREATE TABLE "public"."tbl_usage_browser" ("id" varchar(35) NOT NULL,"count" int2,"name" varchar(50),"windowed" int4 DEFAULT 0,"tabbed" int4 DEFAULT 0,"portal" int4 DEFAULT 0,"lightmode" int4 DEFAULT 0,"darkmode" int4 DEFAULT 0,"mobile" bool DEFAULT false,"date" date,"dtupdated" timestamp,PRIMARY KEY ("id"))');
	db.query('CREATE TABLE "public"."tbl_user_report" ("id" varchar(25) NOT NULL,"userid" varchar(25),"appid" varchar(25),"type" varchar(30),"subject" varchar(100),"body" text,"ip" cidr,"screenshot" bytea,"solved" bool DEFAULT false,"priority" bool DEFAULT false,"dtsolved" timestamp,"dtcreated" timestamp DEFAULT now(),CONSTRAINT "tbl_report_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,CONSTRAINT "tbl_report_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,PRIMARY KEY ("id"))');
	db.query(`CREATE VIEW view_user AS SELECT a.id,a.supervisorid,a.deputyid,a.groupid,a.directory,a.directoryid,a.statusid,a.status,a.photo,a.name,a.linker,a.search,a.note,a.firstname,a.lastname,a.middlename,a.gender,a.email,a.phone,a.company,a.locking,a.pin,a.ou,a.language,a.reference,a.locality,a."position",a.roles,a.groups,a.blocked,a.customer,a.notifications,a.notificationsemail,a.notificationsphone,a.sa,a.inactive,a.online,a.countsessions,a.countbadges,a.countnotifications,a.otp,a.sounds,a.contractid,a.colorscheme,a.darkmode,a.background,a.desktop,a.dateformat,a.timeformat,a.numberformat,a.running,a.dtbirth,a.dtbeg,a.dtend,a.dtupdated,a.dtcreated,a.dtlogged,a.dtmodified,CASE WHEN (length(a.deputyid) > 0) THEN (SELECT b.name FROM tbl_user b WHERE b.id = a.deputyid LIMIT 1) ELSE ''::text END AS deputy,CASE WHEN (length(a.supervisorid) > 0) THEN (SELECT c.name FROM tbl_user c WHERE c.id=a.supervisorid LIMIT 1) ELSE ''::text END AS supervisor FROM tbl_user a`);
	db.query(`CREATE VIEW view_user_report AS SELECT a.id, a.userid, a.appid, a.type, a.subject, a.body, a.ip, a.solved, a.priority, a.dtsolved, a.dtcreated, length(a.screenshot) AS screenshot, b.name AS username, b.photo AS userphoto, b."position" AS userposition, c.title AS appname, c.icon AS appicon FROM tbl_user_report a LEFT JOIN tbl_user b ON b.id = a.userid LEFT JOIN tbl_app c ON c.id = a.appid`);
});

db.callback($.done());