var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.columns WHERE table_name=\'tbl_app\' and column_name=\'typeid\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.query('ALTER TABLE tbl_log ADD data JSON');
	db.query('ALTER TABLE tbl_app ADD typeid VARCHAR(10)');
	db.query('ALTER TABLE tbl_app ADD origintoken VARCHAR(50)');
	db.query('ALTER TABLE tbl_app ADD allowmail BOOLEAN DEFAULT false');
	db.query('ALTER TABLE tbl_app ADD allowsms BOOLEAN DEFAULT false');
	db.query('ALTER TABLE tbl_user ADD oauth2 VARCHAR(25)');
	db.query('ALTER TABLE tbl_user ADD checksum VARCHAR(30)');
	db.query('ALTER TABLE tbl_user ADD profileid VARCHAR(50)');
	db.query('ALTER TABLE tbl_user_app ADD sounds BOOLEAN default true');
	db.query('UPDATE cl_config SET value=\'https://marketplace.openplatform.cloud\' WHERE id=\'marketplace\'');
	db.insert('cl_config', { id: 'auth_cookie', type: 'string', value: U.random_string(10), name: 'auth_cookie', dtcreated: NOW });
	db.insert('cl_config', { id: 'auth_secret', type: 'string', value: GUID(10), name: 'auth_secret', dtcreated: NOW });
	db.insert('cl_config', { id: 'cdn', type: 'string', value: CONF.cdn, name: 'cdn', dtcreated: NOW });

	db.query(`CREATE TABLE "public"."tbl_user_session" (
		"id" varchar(25) NOT NULL,
		"userid" varchar(25),
		"profileid" varchar(50),
		"ip" cidr,
		"ua" varchar(50),
		"referrer" varchar(150),
		"locked" bool DEFAULT false,
		"logged" int4 DEFAULT 0,
		"online" bool DEFAULT false,
		"dtexpire" timestamp,
		"dtcreated" timestamp,
		"dtlogged" timestamp,
		CONSTRAINT "tbl_user_session_userid_fkey" FOREIGN KEY ("userid") REFERENCES "public"."tbl_user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
		PRIMARY KEY ("id")
	)`);

	db.query('DROP VIEW view_user');
	db.query(`CREATE VIEW view_user AS
	SELECT a.id,
		a.supervisorid,
		a.profileid,
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

});

db.callback($.done());