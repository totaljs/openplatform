var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.columns WHERE table_name=\'tbl_user\' and column_name=\'dn\'').first();
db.task(function(responses, response) {

	if (response)
		return;

	db.query('ALTER TABLE tbl_log ALTER COLUMN "type" SET DATA TYPE varchar(60)');
	db.query('ALTER TABLE tbl_log ALTER COLUMN "message" SET DATA TYPE varchar(500)');
	db.query('ALTER TABLE tbl_log ALTER COLUMN "data" SET DATA TYPE text');
	db.query('ALTER TABLE cl_language ADD active boolean DEFAULT \'TRUE\'');
	db.query('ALTER TABLE tbl_user ADD dn VARCHAR(500)');
	db.query('ALTER TABLE tbl_user ADD stamp VARCHAR(25)');
	db.query('DROP TABLE tbl_user_log');
	db.insert('cl_config', { id: 'allowpassword', type: 'boolean', value: 'true', name: 'allowpassword', dtcreated: NOW });
	db.insert('cl_config', { id: 'allow_custom_titles', type: 'boolean', value: 'true', name: 'allow_custom_titles', dtcreated: NOW });
	db.insert('cl_config', { id: 'cdn', type: 'string', value: '//cdn.componentator.com', name: 'cdn', dtcreated: NOW });
	db.insert('cl_config', { id: 'mode', type: 'string', value: 'test', name: 'mode', dtcreated: NOW });

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
		a.oauth2,
		a.dn
	FROM tbl_user a`);

});

db.callback($.done());