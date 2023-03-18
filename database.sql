---------------------------------------
-- TABLES
---------------------------------------

CREATE SCHEMA op;

---------------------------------------
-- TABLES
---------------------------------------

CREATE TABLE "op"."cl_config" (
	"id" text NOT NULL,
	"value" text,
	"type" text,
	"name" text,
	"dtupdated" timestamp DEFAULT now(),
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_group" (
	"id" text NOT NULL,
	"checksum" text,
	"reference" text,
	"name" text,
	"color" text,
	"icon" text,
	"isdisabled" bool DEFAULT false,
	"isprocessed" bool DEFAULT false,
	"dtprocessed" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_user" (
	"id" text NOT NULL,
	"token" text,
	"checksum" text,
	"reference" text,
	"language" text,
	"gender" text,
	"photo" text,
	"name" text,
	"search" text,
	"email" text,
	"password" text,
	"color" text,
	"interface" text,
	"unread" int4 DEFAULT 0,
	"darkmode" int2 DEFAULT 0,
	"logged" int4 DEFAULT 0,
	"sounds" bool DEFAULT true,
	"notifications" bool DEFAULT true,
	"sa" bool DEFAULT false,
	"isreset" bool DEFAULT false,
	"isdisabled" bool DEFAULT false,
	"isconfirmed" bool DEFAULT false,
	"isinactive" bool DEFAULT false,
	"isonline" bool DEFAULT false,
	"isprocessed" bool DEFAULT false,
	"isremoved" bool DEFAULT false,
	"cache" json,
	"cachefilter" _text,
	"dtbirth" date,
	"dtnotified" timestamp,
	"dtlogged" timestamp,
	"dtprocessed" timestamp,
	"dtpassword" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	"dtremoved" timestamp,
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);

COMMENT ON COLUMN "op"."tbl_user"."checksum" IS 'It can help with synchronization users from difference sources';
COMMENT ON COLUMN "op"."tbl_user"."isprocessed" IS 'Was the record processed by 3rd party system?';

CREATE TABLE "op"."tbl_session" (
	"id" text NOT NULL,
	"userid" text,
	"ua" text,
	"ip" text,
	"isonline" bool DEFAULT false,
	"isreset" bool DEFAULT false,
	"logged" int4 DEFAULT 0,
	"device" text,
	"dtlogged" timestamp,
	"dtexpire" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_session_userid_fkey" FOREIGN KEY ("userid") REFERENCES "op"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_app" (
	"id" text NOT NULL,
	"checksum" text,
	"reference" text,
	"name" text,
	"color" text,
	"icon" text,
	"meta" text,
	"url" text,
	"reqtoken" text,
	"restoken" text,
	"allow" text,
	"cache" json,
	"sortindex" int2 DEFAULT 0,
	"notifications" bool DEFAULT true,
	"isnewtab" bool DEFAULT false,
	"isbookmark" bool DEFAULT false,
	"isprocessed" bool DEFAULT false,
	"isdisabled" bool DEFAULT false,
	"isremoved" bool DEFAULT false,
	"logged" int4 DEFAULT 0,
	"dtlogged" timestamp,
	"dtprocessed" timestamp,
	"dtupdated" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	"dtremoved" timestamp,
	PRIMARY KEY ("id")
);

COMMENT ON COLUMN "op"."tbl_app"."allow" IS 'Allows only specific IP addresses';

CREATE TABLE "op"."tbl_app_permission" (
	"id" text NOT NULL,
	"appid" text,
	"name" text,
	"value" text,
	"sortindex" int2 DEFAULT 0,
	CONSTRAINT "tbl_app_permission_appid_fkey" FOREIGN KEY ("appid") REFERENCES "op"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_group_permission" (
	"id" text NOT NULL,
	"appid" text,
	"permissionid" text,
	"groupid" text,
	CONSTRAINT "tbl_group_permission_appid_fkey" FOREIGN KEY ("appid") REFERENCES "op"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_group_permission_permissionid_fkey" FOREIGN KEY ("permissionid") REFERENCES "op"."tbl_app_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_group_permission_groupid_fkey" FOREIGN KEY ("groupid") REFERENCES "op"."tbl_group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_app_session" (
	"id" text NOT NULL,
	"sessionid" text,
	"userid" text,
	"appid" text,
	"device" text,
	"ip" text,
	"url" text,
	"reqtoken" text,
	"restoken" text,
	"dtexpire" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_app_session_sessionid_fkey" FOREIGN KEY ("sessionid") REFERENCES "op"."tbl_session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_app_session_appid_fkey" FOREIGN KEY ("appid") REFERENCES "op"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_app_session_userid_fkey" FOREIGN KEY ("userid") REFERENCES "op"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

COMMENT ON COLUMN "op"."tbl_app_session"."reqtoken" IS 'Pregenerated for verification purpose only';
COMMENT ON COLUMN "op"."tbl_app_session"."restoken" IS 'Pregenerated for verification purpose only';

CREATE TABLE "op"."tbl_notification" (
	"id" text NOT NULL,
	"userid" text,
	"appid" text,
	"color" text,
	"icon" text,
	"name" text,
	"body" text,
	"path" text,
	"isread" bool DEFAULT false,
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_notification_userid_fkey" FOREIGN KEY ("userid") REFERENCES "op"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_notification_appid_fkey" FOREIGN KEY ("appid") REFERENCES "op"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_user_app" (
	"id" text NOT NULL,
	"userid" text,
	"appid" text,
	"notify" text,
	"notifytoken" text,
	"unread" int4 DEFAULT 0,
	"badges" int4 DEFAULT 0,
	"sortindex" int2 DEFAULT 0,
	"isfavorite" bool DEFAULT false,
	"notifications" bool DEFAULT true,
	"muted" timestamp,
	"dtupdated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_user_app_userid_fkey" FOREIGN KEY ("userid") REFERENCES "op"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_user_app_appid_fkey" FOREIGN KEY ("appid") REFERENCES "op"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_user_group" (
	"id" text NOT NULL,
	"userid" text,
	"groupid" text,
	CONSTRAINT "tbl_user_group_groupid_fkey" FOREIGN KEY ("groupid") REFERENCES "op"."tbl_group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_user_group_userid_fkey" FOREIGN KEY ("userid") REFERENCES "op"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

COMMENT ON COLUMN "op"."tbl_user_group"."id" IS 'userid + groupid';

CREATE TABLE "op"."tbl_visitor" (
	"id" int4 NOT NULL,
	"maxlogged" int4 DEFAULT 0,
	"desktop" int4 DEFAULT 0,
	"mobile" int4 DEFAULT 0,
	"tablet" int4 DEFAULT 0,
	"date" date,
	PRIMARY KEY ("id")
);

CREATE TABLE "op"."tbl_feedback" (
	"id" text NOT NULL,
	"userid" text,
	"appid" text,
	"account" text,
	"email" text,
	"app" text,
	"ua" text,
	"ip" text,
	"body" text,
	"rating" int2 DEFAULT 0,
	"updatedby" text,
	"iscomplete" bool DEFAULT false,
	"dtcreated" timestamp DEFAULT now(),
	"dtupdated" timestamp,
	CONSTRAINT "tbl_feedback_appid_fkey" FOREIGN KEY ("appid") REFERENCES "op"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "tbl_feedback_userid_fkey" FOREIGN KEY ("userid") REFERENCES "op"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

---------------------------------------
-- INDEXES
---------------------------------------

CREATE INDEX "tbl_user_idx" ON "op"."tbl_user" USING BTREE ("email");
CREATE INDEX "tbl_session_idx" ON "op"."tbl_session" USING BTREE ("userid");
CREATE INDEX "tbl_notification_idx" ON "op"."tbl_notification" USING BTREE ("userid","dtcreated");
CREATE INDEX "tbl_user_group_idx" ON "op"."tbl_user_group" USING BTREE ("userid","groupid");

---------------------------------------
-- VIEWS
---------------------------------------

CREATE OR REPLACE VIEW op.view_user AS
	SELECT
		a.id,
		a.name,
		a.language,
		a.gender,
		a.photo,
		a.search,
		a.email,
		a.color,
		a.interface,
		a.unread,
		a.darkmode,
		a.logged,
		a.sounds,
		a.notifications,
		a.sa,
		a.isconfirmed,
		a.isdisabled,
		a.isinactive,
		a.dtbirth,
		a.dtlogged,
		a.dtpassword,
		a.dtcreated,
		a.dtupdated,
		a.dtnotified,
		array_to_string(ARRAY(SELECT b.name FROM op.tbl_group b WHERE (b.id IN (SELECT c.groupid FROM op.tbl_user_group c WHERE c.userid = a.id))), ', '::text) AS groups,
		a.isonline
	FROM op.tbl_user a
		WHERE a.isremoved = false;

CREATE OR REPLACE VIEW op.view_group AS
	SELECT
		a.id,
		a.reference,
		a.name,
		a.color,
		a.icon,
		a.isdisabled,
		a.dtcreated,
		a.dtupdated,
		(SELECT count(1) AS count FROM op.tbl_user_group b WHERE b.groupid = a.id) AS users
	FROM op.tbl_group a;

---------------------------------------
-- DATA
---------------------------------------

INSERT INTO "op"."cl_config" ("id", "value", "type", "name") VALUES
	('app_session_expire', '1 day', 'string', 'App session expiration'),
	('auth_cookie', '{cookie}', 'string', 'Cookie name'),
	('auth_cookie_expire', '1 month', 'string', 'Cookie expiration'),
	('auth_cookie_options', '{"httponly":true,"security":"lax"}', 'object', 'Cookie settings'),
	('auth_expire', '5 minutes', 'string', 'Session expiration'),
	('auth_secret', '{secret}', 'string', 'Cookie secret'),
	('auth_strict', 'false', 'boolean', 'Strict session'),
	('allow_tms', 'false', 'boolean', 'Allow TMS'),
	('allow_token', 'false', 'boolean', 'Allow API'),
	('cdn', 'https://cdn.componentator.com/', 'string', 'CDN'),
	('color', '#4285F4', 'string', 'Color'),
	('icon', '', 'string', 'Icon'),
	('id', '{id}', 'string', 'ID'),
	('language', 'en', 'string', 'A default language'),
	('mail_from', '', 'string', 'Sender address'),
	('mail_smtp', '', 'string', 'SMTP server'),
	('mail_smtp_options', '{"port":465,"secure":true,"user":"","password":""}', 'object', 'SMTP options'),
	('name', 'OpenPlatform', 'string', 'Name'),
	('salt', '{salt}', 'string', 'Salt for passwords'),
	('saltchecksum', '{saltchecksum}', 'string', 'Salf for checksums'),
	('secret', '{secret}', 'string', 'Secret for tokens'),
	('secret_tms', '{tms}', 'string', 'TMS token'),
	('token', '{maintoken}', 'string', 'Secret token'),
	('url', '{url}', 'string', 'URL address');

-- DEFAULT GROUP
INSERT INTO "op"."tbl_group" ("id", "name", "dtcreated") VALUES('{groupid}', 'Admin', NOW());

-- DEFAULT USER
INSERT INTO "op"."tbl_user" ("id", "token", "name", "search", "email", "password", "color", "sa", "isconfirmed", "dtcreated") VALUES('{userid}', '{token}', 'John Connor', 'john conor', 'info@totaljs.com', '{password}', '#4285F4', 't', 't', NOW());

-- ASSIGN A DEFAULT GROUP TO THE USER
INSERT INTO "op"."tbl_user_group" ("id", "userid", "groupid") VALUES('{userid}{groupid}', '{userid}', '{groupid}');