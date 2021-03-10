-- ==============================
-- TABLES
-- ==============================

CREATE TABLE "public"."cl_config" (
	"id" varchar(30) NOT NULL,
	"type" varchar(10),
	"value" text,
	"name" varchar(50),
	"dtcreated" timestamp DEFAULT now(),
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."cl_language" (
	"id" varchar(2) NOT NULL,
	"name" varchar(50),
	"spoken" varchar(40),
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user" (
	"id" varchar(25) NOT NULL,
	"supervisorid" varchar(25),
	"deputyid" varchar(25),
	"groupid" varchar(30),
	"oauth2" varchar(25),
	"accesstoken" varchar(50),
	"verifytoken" varchar(20),
	"directory" varchar(25),
	"directoryid" int4,
	"contractid" int4,
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
	"middlename" varchar(40),
	"gender" varchar(6),
	"email" varchar(120),
	"phone" varchar(30),
	"company" varchar(40),
	"locking" int2,
	"pin" varchar(20),
	"language" varchar(2),
	"reference" varchar(100),
	"locality" varchar(40),
	"position" varchar(40),
	"login" varchar(120),
	"password" varchar(80),
	"otpsecret" varchar(80),
	"colorscheme" varchar(7),
	"background" varchar(150),
	"checksum" varchar(30),
	"note" varchar(80),
	"repo" jsonb,
	"ou" _varchar,
	"roles" _varchar,
	"groups" _varchar,
	"groupshash" varchar(20),
	"blocked" bool DEFAULT false,
	"customer" bool DEFAULT false,
	"notifications" bool DEFAULT true,
	"notificationsemail" bool DEFAULT true,
	"notificationsphone" bool DEFAULT false,
	"countnotifications" int2 DEFAULT '0'::smallint,
	"countbadges" int2 DEFAULT '0'::smallint,
	"countsessions" int2 DEFAULT '0'::smallint,
	"volume" int2 DEFAULT '50'::smallint,
	"sa" bool DEFAULT false,
	"darkmode" bool DEFAULT false,
	"inactive" bool DEFAULT false,
	"sounds" bool DEFAULT true,
	"desktop" int2 DEFAULT '1'::smallint,
	"otp" bool DEFAULT false,
	"online" bool DEFAULT false,
	"running" _varchar,
	"dtbirth" timestamp,
	"dtbeg" timestamp,
	"dtend" timestamp,
	"dtlogged" timestamp,
	"dtnotified" timestamp,
	"dtpassword" timestamp,
	"dtmodified" timestamp,
	"dtupdated" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_user_supervisorid_fkey" FOREIGN KEY ("supervisorid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_user_deputyid_fkey" FOREIGN KEY ("deputyid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	PRIMARY KEY(id)
);

CREATE TABLE "public"."tbl_app" (
	"id" varchar(25) NOT NULL,
	"workshopid" varchar(25),
	"typeid" varchar(10),
	"url" varchar(500),
	"accesstoken" varchar(50),
	"name" varchar(30),
	"title" varchar(40),
	"titles" json, -- localized titles
	"reference" varchar(40),
	"linker" varchar(40),
	"servicetoken" varchar(40),
	"search" varchar(40),
	"description" varchar(100),
	"sn" varchar(50),
	"author" varchar(50),
	"type" varchar(30),
	"icon" varchar(30),
	"color" varchar(7),
	"frame" varchar(500),
	"email" varchar(120),
	"roles" _varchar,
	"origin" _varchar,
	"directories" _varchar,
	"custom" varchar(1000),
	"hostname" varchar(80),
	"version" varchar(20),
	"position" int2 DEFAULT '0'::smallint,
	"width" int2,
	"height" int2,
	"settings" jsonb,
	"services" jsonb,
	"allownotifications" bool,
	"allowreadusers" int2 DEFAULT '0'::smallint,
	"allowreadapps" int2 DEFAULT '0'::smallint,
	"allowreadprofile" int2 DEFAULT '0'::smallint,
	"allowreadmeta" bool DEFAULT true,
	"allowguestuser" bool DEFAULT false,
	"mobilemenu" bool DEFAULT false,
	"autorefresh" bool DEFAULT false,
	"serververify" bool DEFAULT true,
	"checksum" varchar(30),
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
	"version" varchar(10),
	"roles" _varchar,
	"position" int2 DEFAULT 0,
	"settings" varchar(100),
	"notifications" bool DEFAULT true,
	"inherited" bool DEFAULT false,
	"favorite" bool DEFAULT false,
	"countnotifications" int4 DEFAULT 0,
	"countbadges" int4 DEFAULT 0,
	"countopen" int4 DEFAULT 0,
	"dtopen" timestamp,
	"dtcreated" timestamp,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_user_app_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_user_app_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user_removed" (
	"id" varchar(25) NOT NULL,
	"contractid" int2,
	"groupid" varchar(25),
	"reference" varchar(25),
	"groups" _varchar,
	"dtcreated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user_config" (
	"id" varchar(50) NOT NULL,
	"userid" varchar(25),
	"appid" varchar(25),
	"body" text,
	"dtcreated" timestamp,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_user_config_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."tbl_user_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_user_config_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_user_config_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."tbl_user_log" (
	"userid" varchar(25),
	"appid" varchar(25),
	"type" varchar(10),
	"body" varchar(500),
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_user_log_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_user_log_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."tbl_log" (
	"id" serial,
	"userid" varchar(25),
	"rowid" varchar(50),
	"type" varchar(25),
	"message" varchar(200),
	"username" varchar(60),
	"ua" varchar(30),
	"data" json,
	"ip" cidr,
	"dtcreated" timestamp DEFAULT NOW(),
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user_notification" (
	"id" varchar(25) NOT NULL,
	"userappid" varchar(50),
	"userid" varchar(25),
	"appid" varchar(25),
	"type" int2,
	"title" varchar(100),
	"body" varchar(1000),
	"data" varchar(1000),
	"ip" cidr,
	"unread" boolean DEFAULT TRUE,
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_notification_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_notification_userappid_fkey" FOREIGN KEY ("userappid") REFERENCES "public"."tbl_user_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_notification_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."tbl_user_report" (
	"id" varchar(25) NOT NULL,
	"userid" varchar(25),
	"appid" varchar(25),
	"type" varchar(30),
	"subject" varchar(100),
	"body" text,
	"ip" cidr,
	"screenshot" bytea,
	"solved" bool DEFAULT false,
	"priority" bool DEFAULT false,
	"dtsolved" timestamp,
	"dtcreated" timestamp DEFAULT now(),
	CONSTRAINT "tbl_report_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_report_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_user_member" (
	"id" varchar(25) NOT NULL,
	"userid" varchar(25),
	"email" varchar(120),
	"dtcreated" timestamp,
	CONSTRAINT "tbl_user_member_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_settings" (
	"id" varchar(30),
	"body" jsonb,
	"dtupdated" timestamp,
	"dtcreated" timestamp
);

CREATE TABLE "public"."cl_role" (
	"id" varchar(50) NOT NULL,
	"name" varchar(50)
);

CREATE TABLE "public"."tbl_group" (
	"id" varchar(50) NOT NULL,
	"parentid" varchar(50),
	"name" varchar(50),
	"note" varchar(200),
	"dtcreated" timestamp,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_group_parentid_fkey" FOREIGN KEY ("parentid") REFERENCES "public"."tbl_group"("id") ON DELETE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_group_app" (
	"id" varchar(75) NOT NULL,
	"groupid" varchar(50),
	"appid" varchar(25),
	"roles" _varchar,
	CONSTRAINT "tbl_group_app_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE,
	CONSTRAINT "tbl_group_app_groupid_fkey" FOREIGN KEY ("groupid") REFERENCES "public"."tbl_group"("id") ON DELETE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_oauth" (
	"id" varchar(25) NOT NULL,
	"accesstoken" varchar(50),
	"name" varchar(40),
	"url" varchar(500),
	"icon" varchar(30),
	"version" varchar(20),
	"allowreadprofile" int2 DEFAULT 0,
	"allowreadapps" int2 DEFAULT 0,
	"allowreadusers" int2 DEFAULT 0,
	"allowreadmeta" int2 DEFAULT 0,
	"blocked" bool DEFAULT false,
	"dtused" timestamp,
	"dtcreated" timestamp,
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_usage" (
	"id" varchar(10) NOT NULL,
	"online" int4 DEFAULT 0,
	"logged" int4 DEFAULT 0,
	"maxonline" int4 DEFAULT 0,
	"desktop" int4 DEFAULT 0,
	"mobile" int4 DEFAULT 0,
	"windowed" int4 DEFAULT 0,
	"tabbed" int4 DEFAULT 0,
	"portal" int4 DEFAULT 0,
	"lightmode" int4 DEFAULT 0,
	"darkmode" int4 DEFAULT 0,
	"date" date,
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_usage_app" (
	"id" varchar(35) NOT NULL,
	"appid" varchar(25),
	"count" int4 DEFAULT 0,
	"mobile" int4 DEFAULT 0,
	"desktop" int4 DEFAULT 0,
	"windowed" int4 DEFAULT 0,
	"tabbed" int4 DEFAULT 0,
	"portal" int4 DEFAULT 0,
	"lightmode" int4 DEFAULT 0,
	"darkmode" int4 DEFAULT 0,
	"date" date,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_usage_app_appid_fkey" FOREIGN KEY ("appid") REFERENCES "public"."tbl_app"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_usage_browser" (
	"id" varchar(35) NOT NULL,
	"count" int2,
	"name" varchar(50),
	"windowed" int4 DEFAULT 0,
	"tabbed" int4 DEFAULT 0,
	"portal" int4 DEFAULT 0,
	"lightmode" int4 DEFAULT 0,
	"darkmode" int4 DEFAULT 0,
	"mobile" bool DEFAULT false,
	"date" date,
	"dtupdated" timestamp,
	PRIMARY KEY ("id")
);

CREATE TABLE "public"."tbl_usage_oauth" (
	"id" varchar(35) NOT NULL,
	"oauthid" varchar(25),
	"count" int4 DEFAULT 0,
	"mobile" int4 DEFAULT 0,
	"desktop" int4 DEFAULT 0,
	"windowed" int4 DEFAULT 0,
	"tabbed" int4 DEFAULT 0,
	"portal" int4 DEFAULT 0,
	"lightmode" int4 DEFAULT 0,
	"darkmode" int4 DEFAULT 0,
	"date" date,
	"dtupdated" timestamp,
	CONSTRAINT "tbl_usage_oauth_oauthid_fkey" FOREIGN KEY ("oauthid") REFERENCES "public"."tbl_oauth"("id") ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY ("id")
);

/*
CREATE TABLE "public"."tbl_app_source" (
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
);

CREATE TABLE "public"."tbl_app_source_bk" (
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
);

CREATE TABLE "public"."tbl_app_ui" (
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
);

CREATE TABLE "public"."tbl_app_ui_bk" (
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
);

CREATE TABLE "public"."cl_component" (
	"id" varchar(100) NOT NULL,
	"dtcreated" timestamp DEFAULT now(),
	PRIMARY KEY ("id")
);*/

-- ==============================
-- VIEWS
-- ==============================

CREATE VIEW view_user AS
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
		a.oauth2,
		CASE WHEN (length(a.deputyid) > 0) THEN (SELECT b.name FROM tbl_user b WHERE b.id = a.deputyid LIMIT 1) ELSE ''::text END AS deputy,
		CASE WHEN (length(a.supervisorid) > 0) THEN (SELECT c.name FROM tbl_user c WHERE c.id=a.supervisorid LIMIT 1) ELSE ''::text END AS supervisor
	FROM tbl_user a;

CREATE VIEW view_user_report AS
	SELECT a.id,
		a.userid,
		a.appid,
		a.type,
		a.subject,
		a.body,
		a.ip,
		a.solved,
		a.priority,
		a.dtsolved,
		a.dtcreated,
		length(a.screenshot) AS screenshot,
		b.name AS username,
		b.photo AS userphoto,
		b."position" AS userposition,
		c.title AS appname,
		c.icon AS appicon
	FROM tbl_user_report a
		LEFT JOIN tbl_user b ON b.id = a.userid
		LEFT JOIN tbl_app c ON c.id = a.appid;

-- ==============================
-- INDEXES
-- ==============================

CREATE INDEX tbl_user_app_idx_query ON tbl_user_app(userid text_ops);
CREATE INDEX tbl_user_idx_login ON tbl_user(login text_ops);
CREATE INDEX tbl_user_idx_member ON tbl_user(email text_ops);
CREATE INDEX tbl_user_member_idx_user ON tbl_user_member(userid text_ops);
CREATE INDEX tbl_user_idx_group ON tbl_user(groupshash text_ops);
CREATE INDEX tbl_user_notification_idx_query ON tbl_user_notification(userappid text_ops);
CREATE INDEX tbl_user_idx_reference ON tbl_user(reference text_ops);

-- ==============================
-- COMMENTS
-- ==============================

COMMENT ON COLUMN "public"."tbl_user_app"."id" IS 'userid + appid';
COMMENT ON COLUMN "public"."tbl_user_app"."inherited" IS 'Is the app inherited from a group?';
COMMENT ON COLUMN "public"."tbl_user_notification"."userappid" IS 'userid + appid';
COMMENT ON COLUMN "public"."tbl_user_config"."id" IS 'userid + appid';
COMMENT ON COLUMN "public"."tbl_app"."url" IS 'URL address to openplatform.json';
COMMENT ON COLUMN "public"."tbl_app"."frame" IS 'Frame URL address';

-- ==============================
-- DATA
-- ==============================

/*
-- INSERT UI Components
INSERT INTO "public"."cl_component" ("id") VALUES
('https://cdn.componentator.com/designer/components.json');
*/

-- INSERT DEFAULT CONFIGURATION
INSERT INTO "public"."cl_config" ("id", "type", "value", "name", "dtcreated") VALUES
('accesstoken', 'string', (SELECT md5(random()::text)), 'accesstoken', NOW()),
('allowappearance', 'boolean', 'true', 'allowappearance', NOW()),
('allowbackground', 'boolean', 'true', 'allowbackground', NOW()),
('allowclock', 'boolean', 'true', 'allowclock', NOW()),
('allowcreate', 'string', '', 'allowcreate', NOW()),
('allowdesktop', 'boolean', 'true', 'allowdesktop', NOW()),
('allowdesktopfluid', 'boolean', 'true', 'allowdesktopfluid', NOW()),
('allowmembers', 'boolean', 'true', 'allowmembers', NOW()),
('allownickname', 'boolean', 'true', 'allownickname', NOW()),
('allownotifications', 'boolean', 'true', 'allownotifications', NOW()),
('allowprofile', 'boolean', 'true', 'allowprofile', NOW()),
('allowsmembers', 'boolean', 'false', 'allowsmembers', NOW()),
('allowstatus', 'boolean', 'true', 'allowstatus', NOW()),
('allowtheme', 'boolean', 'true', 'allowtheme', NOW()),
('allowaccesstoken', 'boolean', 'true', 'allowaccesstoken', NOW()),
('allowoauth', 'boolean', 'true', 'allowoauth', NOW()),
('background', 'string', '', 'background', NOW()),
('colorscheme', 'string', '#4285f4', 'colorscheme', NOW()),
('cookie_expiration', 'string', '3 days', 'cookie_expiration', NOW()),
('defaultappid', 'string', '', 'defaultappid', NOW()),
('email', 'string', 'info@totaljs.com', 'email', NOW()),
('guest', 'boolean', 'true', 'guest', NOW()),
('marketplace', 'string', 'https://marketplace.totaljs.com/openplatform/', 'marketplace', NOW()),
('maxmembers', 'number', '10', 'maxmembers', NOW()),
('name', 'string', 'OpenPlatform', 'name', NOW()),
('sender', 'string', 'info@totaljs.com', 'sender', NOW()),
('smtp', 'string', 'localhost', 'smtp', NOW()),
('smtpsettings', 'json', '{"user":"","password":"","timeout":2000}', 'smtpsettings', NOW()),
('test', 'boolean', 'true', 'test', NOW()),
('url', 'string', 'https://YOURDOMAIN.com', 'url', NOW()),
('verifytoken', 'string', SUBSTRING((SELECT md5(random()::text)), 0, 10), 'verifytoken', NOW()),
('welcome', 'string', '', 'welcome', NOW());

-- INSERT LANGUAGES
INSERT INTO "public"."cl_language" ("id", "name", "spoken") VALUES
('aa', 'Afar', 'Afaraf'),
('ab', 'Abkhaz', 'Аҧсуа'),
('ae', 'Avestan', 'avesta'),
('af', 'Afrikaans', 'Afrikaans'),
('ak', 'Akan', 'Akan'),
('am', 'Amharic', 'አማርኛ'),
('an', 'Aragonese', 'Aragonés'),
('ar', 'Arabic', 'العربية'),
('as', 'Assamese', 'অসমীয়া'),
('av', 'Avaric', 'авар мацӀ; магӀарул мацӀ'),
('ay', 'Aymara', 'aymar aru'),
('az', 'Azerbaijani', 'azərbaycan dili'),
('ba', 'Bashkir', 'башҡорт теле'),
('be', 'Belarusian', 'Беларуская'),
('bg', 'Bulgarian', 'български език'),
('bh', 'Bihari', 'भोजपुरी'),
('bi', 'Bislama', 'Bislama'),
('bm', 'Bambara', 'bamanankan'),
('bn', 'Bengali', 'বাংলা'),
('bo', 'Tibetan', 'བོད་ཡིག'),
('br', 'Breton', 'brezhoneg'),
('bs', 'Bosnian', 'bosanski jezik'),
('ca', 'Catalan', 'Català'),
('ce', 'Chechen', 'нохчийн мотт'),
('ch', 'Chamorro', 'Chamoru'),
('co', 'Corsican', 'corsu; lingua corsa'),
('cr', 'Cree', 'ᓀᐦᐃᔭᐍᐏᐣ'),
('cs', 'Czech', 'čeština'),
('cu', 'Church Slavic', 'словѣньскъ ѩꙁꙑкъ'),
('cv', 'Chuvash', 'чӑваш чӗлхи'),
('cy', 'Welsh', 'Cymraeg'),
('da', 'Danish', 'dansk'),
('de', 'German', 'Deutsch'),
('dv', 'Divehi', 'ދިވެހި'),
('dz', 'Dzongkha', 'རྫོང་ཁ'),
('ee', 'Ewe', 'Ɛʋɛgbɛ'),
('el', 'Greek', 'Ελληνικά'),
('en', 'English', 'English'),
('eo', 'Esperanto', 'Esperanto'),
('es', 'Spanish', 'español; castellano'),
('et', 'Estonian', 'Eesti keel'),
('eu', 'Basque', 'euskara'),
('fa', 'Persian', 'فارسی'),
('ff', 'Fulah', 'Fulfulde'),
('fi', 'Finnish', 'Suomen kieli'),
('fj', 'Fijian', 'vosa Vakaviti'),
('fo', 'Faroese', 'Føroyskt'),
('fr', 'French', 'français; langue française'),
('fy', 'Western Frisian', 'Frysk'),
('ga', 'Irish', 'Gaeilge'),
('gd', 'Gaelic', 'Gàidhlig'),
('gl', 'Galician', 'Galego'),
('gn', 'Guaraní', 'Avañe''ẽ'),
('gu', 'Gujarati', 'ગુજરાતી'),
('gv', 'Manx', 'Ghaelg'),
('ha', 'Hausa', 'هَوُسَ'),
('he', 'Hebrew', 'עברית'),
('hi', 'Hindi', 'हिन्दी'),
('ho', 'Hiri Motu', 'Hiri Motu'),
('hr', 'Croatian', 'Hrvatski'),
('ht', 'Haitian', 'Kreyòl ayisyen'),
('hu', 'Hungarian', 'Magyar'),
('hy', 'Armenian', 'Հայերեն'),
('hz', 'Herero', 'Otjiherero'),
('ia', 'Interlingua', 'Interlingua'),
('id', 'Indonesian', 'Bahasa Indonesia'),
('ie', 'Interlingue', 'Interlingue'),
('ig', 'Igbo', 'Igbo'),
('ii', 'Sichuan Yi', 'ꆇꉙ'),
('ik', 'Inupiaq', 'Iñupiaq; Iñupiatun'),
('io', 'Ido', 'Ido'),
('is', 'Icelandic', 'Íslenska'),
('it', 'Italian', 'Italiano'),
('iu', 'Inuktitut', 'ᐃᓄᒃᑎᑐᑦ'),
('ja', 'Japanese', '日本語 (にほんご)'),
('jv', 'Javanese', 'basa Jawa'),
('ka', 'Georgian', 'ქართული'),
('kg', 'Kongo', 'KiKongo'),
('ki', 'Kikuyu', 'Gĩkũyũ'),
('kj', 'Kuanyama', 'Kuanyama'),
('kk', 'Kazakh', 'Қазақ тілі'),
('kl', 'Kalaallisut', 'kalaallisut; kalaallit oqaasii'),
('km', 'Khmer', 'ភាសាខ្មែរ'),
('kn', 'Kannada', 'ಕನ್ನಡ'),
('ko', 'Korean', '한국어 (韓國語); 조선말 (朝鮮語)'),
('kr', 'Kanuri', 'Kanuri'),
('ks', 'Kashmiri', 'कश्मीरी; كشميري'),
('ku', 'Kurdish', 'Kurdî; كوردی'),
('kv', 'Komi', 'коми кыв'),
('kw', 'Cornish', 'Kernewek'),
('ky', 'Kirghiz', 'кыргыз тили'),
('la', 'latin', 'latine; lingua latina'),
('lb', 'Luxembourgish', 'Lëtzebuergesch'),
('lg', 'Ganda', 'Luganda'),
('li', 'Limburgish', 'Limburgs'),
('ln', 'Lingala', 'Lingála'),
('lo', 'Lao', 'ພາສາລາວ'),
('lt', 'Lithuanian', 'lietuvių kalba'),
('lu', 'Luba-Katanga', 'luba'),
('lv', 'Latvian', 'latviešu valoda'),
('mg', 'Malagasy', 'Malagasy fiteny'),
('mh', 'Marshallese', 'Kajin M̧ajeļ'),
('mi', 'Māori', 'te reo Māori'),
('mk', 'Macedonian', 'македонски јазик'),
('ml', 'Malayalam', 'മലയാളം'),
('mn', 'Mongolian', 'Монгол'),
('mo', 'Moldavian', 'лимба молдовеняскэ'),
('mr', 'Marathi', 'मराठी'),
('ms', 'Malay', 'bahasa Melayu; بهاس ملايو'),
('mt', 'Maltese', 'Malti'),
('my', 'Burmese', 'မ္ရန္‌မာစကား (Myanma zaga)'),
('na', 'Nauru', 'Ekakairũ Naoero'),
('nb', 'Norwegian Bokmål', 'Norsk (bokmål)'),
('nd', 'North Ndebele', 'isiNdebele'),
('ne', 'Nepali', 'नेपाली'),
('ng', 'Ndonga', 'Owambo'),
('nl', 'Dutch', 'Nederlands'),
('nn', 'Norwegian Nynorsk', 'Nynorsk'),
('no', 'Norwegian', 'Norsk'),
('nr', 'South Ndebele', 'Ndébélé'),
('nv', 'Navajo', 'Diné bizaad; Dinékʼehǰí'),
('ny', 'Chichewa', 'chiCheŵa; chinyanja'),
('oc', 'Occitan', 'Occitan'),
('oj', 'Ojibwa', 'ᐊᓂᔑᓈᐯᒧᐎᓐ'),
('om', 'Oromo', 'Afaan Oromoo'),
('or', 'Oriya', 'ଓଡ଼ିଆ'),
('os', 'Ossetian', 'Ирон æвзаг'),
('pa', 'Panjabi', 'ਪੰਜਾਬੀ; پنجابی'),
('pi', 'Pāli', 'पाऴि'),
('pl', 'Polish', 'Polski'),
('ps', 'Pashto', 'پښتو'),
('pt', 'Portuguese', 'Português'),
('qu', 'Quechua', 'Runa Simi; Kichwa'),
('rm', 'Raeto-Romance', 'rumantsch grischun'),
('rn', 'Kirundi', 'kiRundi'),
('ro', 'Romanian', 'română'),
('ru', 'Russian', 'русский язык'),
('rw', 'Kinyarwanda', 'Kinyarwanda'),
('sa', 'Sanskrit', 'संस्कृतम्'),
('sc', 'Sardinian', 'sardu'),
('sd', 'Sindhi', 'सिन्धी; سنڌي، سندھی'),
('se', 'Northern Sami', 'Davvisámegiella'),
('sg', 'Sango', 'yângâ tî sängö'),
('sh', 'Serbo-Croatian', 'Српскохрватски'),
('si', 'Sinhala', 'සිංහල'),
('sk', 'Slovak', 'slovenčina'),
('sl', 'Slovenian', 'slovenščina'),
('sm', 'Samoan', 'gagana fa''a Samoa'),
('sn', 'Shona', 'chiShona'),
('so', 'Somali', 'Soomaaliga; af Soomaali'),
('sq', 'Albanian', 'Shqip'),
('sr', 'Serbian', 'српски језик'),
('ss', 'Swati', 'SiSwati'),
('st', 'Southern Sotho', 'seSotho'),
('su', 'Sundanese', 'Basa Sunda'),
('sv', 'Swedish', 'Svenska'),
('sw', 'Swahili', 'Kiswahili'),
('ta', 'Tamil', 'தமிழ்'),
('te', 'Telugu', 'తెలుగు'),
('tg', 'Tajik', 'тоҷикӣ; toğikī; تاجیکی'),
('th', 'Thai', 'ไทย'),
('ti', 'Tigrinya', 'ትግርኛ'),
('tk', 'Turkmen', 'Türkmen; Түркмен'),
('tl', 'Tagalog', 'Tagalog'),
('tn', 'Tswana', 'seTswana'),
('to', 'Tonga', 'faka Tonga'),
('tr', 'Turkish', 'Türkçe'),
('ts', 'Tsonga', 'xiTsonga'),
('tt', 'Tatar', 'татарча; tatarça; تاتارچا'),
('tw', 'Twi', 'Twi'),
('ty', 'Tahitian', 'Reo Mā`ohi'),
('ug', 'Uighur', 'Uyƣurqə; ئۇيغۇرچ '),
('uk', 'Ukrainian', 'українська мова'),
('ur', 'Urdu', 'اردو'),
('uz', 'Uzbek', 'O''zbek; Ўзбек; أۇزبېك'),
('ve', 'Venda', 'tshiVenḓa'),
('vi', 'Vietnamese', 'Tiếng Việt'),
('vo', 'Volapük', 'Volapük'),
('wa', 'Walloon', 'Walon'),
('wo', 'Wolof', 'Wollof'),
('xh', 'Xhosa', 'isiXhosa'),
('yi', 'Yiddish', 'ייִדיש'),
('yo', 'Yoruba', 'Yorùbá'),
('za', 'Zhuang', 'Saɯ cueŋƅ; Saw cuengh'),
('zh', 'Chinese', '中文、汉语、漢語'),
('zu', 'Zulu', 'isiZulu');