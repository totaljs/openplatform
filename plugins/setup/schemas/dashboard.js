NEWACTION('Dashboard/stats', {
	name: 'Stats',
	action: async function($) {

		var data = {};
		var stats;

		data.sessions = await DATA.count('op.tbl_session').where('dtexpire>NOW()').promise($);
		data.total = {};

		stats = (await DATA.query('SELECT MAX(maxlogged)::int4 AS maxlogged, SUM(desktop)::int4 AS desktop, SUM(mobile)::int4 AS mobile FROM op.tbl_visitor').promise($))[0] || EMPTYARRAY;

		data.total.maxlogged = stats.maxlogged || 0;
		data.total.desktop = stats.desktop || 0;
		data.total.mobile = stats.mobile || 0;

		stats = (await DATA.query('SELECT maxlogged, desktop, mobile FROM op.tbl_visitor WHERE id=' + NOW.format('yyyyMMdd')).promise($))[0] || EMPTYARRAY;

		data.today = {};
		data.today.maxlogged = stats.maxlogged || 0;
		data.today.desktop = stats.desktop || 0;
		data.today.mobile = stats.mobile || 0;

		data.feedback = await DATA.count('op.tbl_feedback').where('iscomplete=FALSE').promise($);
		data.online = await DATA.count('op.tbl_session').where('isonline=TRUE').promise($);
		data.users = await DATA.count('op.tbl_user').where('isremoved=FALSE').promise($);

		var consumption = F.consumption;

		data.memory = consumption.memory;
		data.date = consumption.date;

		$.callback(data);
	}
});