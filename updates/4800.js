var db = DBMS();

db.query('SELECT 1 as r FROM information_schema.columns WHERE table_name=\'tbl_app\' and column_name=\'typeid\'').first();
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
});

db.callback($.done());