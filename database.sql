-- ==============================
-- TABLES
-- ==============================

CREATE TABLE "public"."tbl_user" (
	"id" varchar(25) NOT NULL,
	"supervisorid" varchar(25),
	"delegateid" varchar(25),
	"groupid" varchar(30),
	"accesstoken" varchar(50),
	"verifytoken" varchar(20),
	"directory" varchar(25),
	"directoryid" int4,
	"statusid" int2,
	"status" varchar(70),
	"photo" varchar(80),
	"name" varchar(80),
	"linker" varchar(80),
	"search" varchar(80),
	"dateformat" varchar(20),
	"timeformat" int2,
	"numberformat" int2,
	"firstname" varchar(40),
	"lastname" varchar(40),
	"gender" varchar(6),
	"email" varchar(120),
	"phone" varchar(30),
	"company" varchar(40),
	"ou" varchar(100),
	"locking" int2,
	"pin" varchar(6),
	"ougroups" _varchar,
	"language" varchar(2),
	"reference" varchar(100),
	"locality" varchar(40),
	"position" varchar(40),
	"login" varchar(30),
	"password" varchar(100),
	"colorscheme" varchar(7),
	"background" varchar(150),
	"repo" jsonb,
	"roles" _varchar,
	"groups" _varchar,
	"blocked" bool DEFAULT false,
	"customer" bool DEFAULT false,
	"notifications" bool DEFAULT true,
	"notificationsemail" bool DEFAULT true,
	"notificationsphone" bool DEFAULT false,
	"countnotifications" int2 DEFAULT '0'::smallint,
	"countbadges" int2 DEFAULT '0'::smallint,
	"volume" int2 DEFAULT '50'::smallint,
	"sa" bool DEFAULT false,
	"darkmode" bool DEFAULT false,
	"inactive" bool DEFAULT false,
	"sounds" bool DEFAULT true,
	"online" bool DEFAULT false,
	"dtbirth" timestamp,
	"dtbeg" timestamp,
	"dtend" timestamp,
	"dtupdated" timestamp,
	"dtmodified" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	"dtlogged" timestamp,
	"dtnotified" timestamp,
	PRIMARY KEY(id)
);

CREATE TABLE "public"."tbl_app" (
	"id" varchar(25) NOT NULL,
	"url" varchar(500),
	"accesstoken" varchar(50),
	"name" varchar(30),
	"title" varchar(40),
	"linker" varchar(40),
	"search" varchar(40),
	"description" varchar(100),
	"serialnumber" varchar(50),
	"author" varchar(50),
	"type" varchar(30),
	"icon" varchar(30),
	"frame" varchar(500),
	"email" varchar(120),
	"roles" _varchar,
	"origin" _varchar,
	"directories" _varchar,
	"custom" varchar(1000),
	"hostname" varchar(80),
	"version" varchar(20),
	"width" int2,
	"height" int2,
	"settings" jsonb,
	"allownotifications" bool,
	"allowreadusers" int2 DEFAULT '0'::smallint,
	"allowreadapps" int2 DEFAULT '0'::smallint,
	"allowreadprofile" int2 DEFAULT '0'::smallint,
	"allowreadmeta" bool DEFAULT true,
	"allowguestuser" bool DEFAULT false,
	"mobilemenu" bool DEFAULT false,
	"autorefresh" bool DEFAULT false,
	"serververify" bool DEFAULT true,
	"responsive" bool DEFAULT false,
	"blocked" bool DEFAULT false,
	"screenshots" bool DEFAULT false,
	"resize" bool DEFAULT true,
	"guest" bool DEFAULT false,
	"online" bool DEFAULT false,
	"dtupdated" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	"dtsync" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user_app" (
	"id" varchar(50) NOT NULL,
	"userid" varchar(25),
	"appid" varchar(25),
	"roles" _varchar,
	"settings" varchar(100),
	"notifications" bool DEFAULT true,
	"countnotifications" int4 DEFAULT 0,
	"countbadges" int4 DEFAULT 0,
	"dtcreated" timestamp,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_user_app_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_user_app_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user_removed" (
	"id" varchar(25) NOT NULL,
	"reference" varchar(25),
	"groupid" varchar(25),
	"dtcreated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_config" (
	"id" varchar(50) NOT NULL,
	"userid" varchar(25),
	"appid" varchar(25),
	"body" text,
	"dtcreated" timestamp,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_config_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."tbl_user_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_config_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_config_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."tbl_log" (
	"userid" varchar(25),
	"appid" varchar(25),
	"type" varchar(10),
	"body" varchar(500),
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_log_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_log_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."tbl_logger" (
	"type" varchar(25),
	"message" varchar(200),
	"username" varchar(60),
	"ip" cidr,
	"dtcreated" timestamp
);

CREATE TABLE "public"."tbl_notification" (
	"id" varchar(25) NOT NULL,
	"userappid" varchar(50),
	"userid" varchar(25),
	"appid" varchar(25),
	"type" int2,
	"title" varchar(100),
	"body" varchar(1000),
	"data" varchar(1000),
	"ip" varchar(60),
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_notification_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_notification_userappid_fkey" FOREIGN KEY ("userappid") REFERENCES "public"."tbl_user_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_notification_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."tbl_settings" (
	"id" varchar(30),
	"body" jsonb,
	"dtupdated" timestamp,
	"dtcreated" timestamp
);

-- ==============================
-- VIEWS
-- ==============================

CREATE VIEW view_userapp AS
	SELECT b.id,
		b.supervisorid,
		b.deputyid,
		b.groupid,
		b.accesstoken,
		b.verifytoken,
		b.directory,
		b.directoryid,
		b.statusid,
		b.status,
		b.photo,
		b.name,
		b.linker,
		b.search,
		b.dateformat,
		b.timeformat,
		b.numberformat,
		b.firstname,
		b.lastname,
		b.gender,
		b.email,
		b.phone,
		b.company,
		b.ou,
		b.locking,
		b.pin,
		b.ougroups,
		b.language,
		b.reference,
		b.locality,
		b."position",
		b.login,
		b.password,
		b.colorscheme,
		b.background,
		b.repo,
		b.roles,
		b.groups,
		b.blocked,
		b.customer,
		b.notifications,
		b.notificationsemail,
		b.notificationsphone,
		b.countnotifications,
		b.countbadges,
		b.volume,
		b.sa,
		b.darkmode,
		b.inactive,
		b.sounds,
		b.online,
		b.dtbirth,
		b.dtbeg,
		b.dtend,
		b.dtupdated,
		b.dtmodified,
		b.dtcreated,
		b.dtlogged,
		b.dtnotified,
		a.appid,
		('{"' || a.appid || '":' || jsonb_build_object('roles', a.roles) || '}')::json AS apps
	FROM (tbl_user_app a LEFT JOIN tbl_user b ON (b.id = a.userid));

-- ==============================
-- COMMENTS
-- ==============================

COMMENT ON COLUMN "public"."tbl_user_app"."id" IS 'userid + appid';
COMMENT ON COLUMN "public"."tbl_notification"."userappid" IS 'userid + appid';
COMMENT ON COLUMN "public"."tbl_config"."id" IS 'userid + appid';
COMMENT ON COLUMN "public"."tbl_app"."url" IS 'URL address to openplatform.json';
COMMENT ON COLUMN "public"."tbl_app"."frame" IS 'Frame URL address';

-- ==============================
-- DATA
-- ==============================

-- MAIN SETTINGS
INSERT INTO "public"."tbl_settings" ("id", "body", "dtupdated", "dtcreated") VALUES ('openplatform', '{"url": "https://YOURDOMAIN.com", "name": "OpenPlatform v4", "smtp": "", "test": true, "email": "petersirka@gmail.com", "guest": true, "welcome": "", "background": "", "accesstoken": "pjyv97q3tms169x4xynuujnjwcm9auvxgjtewg16", "colorscheme": "#4285f4", "marketplace": "", "verifytoken": "7wce97x2k1", "smtpsettings": ""}', NULL, NOW());

-- ADMINISTRATOR
INSERT INTO "public"."tbl_user" ("id", "supervisorid", "deputyid", "groupid", "accesstoken", "verifytoken", "directory", "directoryid", "statusid", "status", "photo", "name", "linker", "search", "dateformat", "timeformat", "numberformat", "firstname", "lastname", "gender", "email", "phone", "company", "ou", "locking", "pin", "ougroups", "language", "reference", "locality", "position", "login", "password", "colorscheme", "background", "repo", "roles", "groups", "blocked", "customer", "notifications", "notificationsemail", "notificationsphone", "countnotifications", "countbadges", "volume", "sa", "darkmode", "inactive", "sounds", "online", "dtbirth", "dtbeg", "dtend", "dtupdated", "dtmodified", "dtcreated", "dtlogged", "dtnotified") VALUES ('19051723010001iye1', '', '', NULL, 'gzv0ucntbka9y8epq32baij361gk78gcnj3z6nk8', 'swkp8sjngjrp0fp', '', '0', '1', 'My work is my hobby', '', 'Peter Sirka', 'peter-sirka', 'sirka peter petersirkagmailcom', 'yyyy-MM-dd', '24', '1', 'Peter', 'Sirka', 'male', 'petersirka@gmail.com', '+421903163302', 'Total Avengers', 'Total.js / Contributors', '0', '', '{Total.js,Total.js/Contributors}', 'en', NULL, 'Slovakia', 'Developer', 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '#4285f4', '', NULL, '{admin}', '{admin}', 'f', 'f', 't', 't', 'f', '0', '0', '50', 't', 'f', 'f', 't', 't', '1984-11-05 23:00:00', NULL, NULL, '2019-05-16 12:25:19.317', '2019-05-16 12:25:19.317', '2017-08-25 10:50:38.648', '2019-05-16 13:42:33.857', '2019-05-16 13:21:35.743');
