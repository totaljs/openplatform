const BOOL = { '1': 'true', 'true': 'true' };

NEWSCHEMA('Users/Assign', function(schema) {

	schema.define('add', '[String(50)]');
	schema.define('rem', '[String(50)]');
	schema.define('filter', 'Object');

	schema.addWorkflow('exec', function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		var model = $.model;
		var db = DBMS();

		if (model.add && model.add.length) {
			for (var i = 0; i < model.add.length; i++) {
				var pggroupid = PG_ESCAPE(model.add[i]);
				applyfilter(db.query('UPDATE tbl_user SET dtmodified=NOW(), dtupdated=NOW(), groups=array_append(groups,{0})'.format(pggroupid)), model.filter).query('NOT ({0}=ANY(groups))'.format(pggroupid));
			}
		}

		if (model.rem && model.rem.length) {
			for (var i = 0; i < model.rem.length; i++) {
				var pggroupid = PG_ESCAPE(model.rem[i]);
				applyfilter(db.query('UPDATE tbl_user SET dtmodified=NOW(), dtupdated=NOW(), groups=array_remove(groups,{0})'.format(pggroupid)), model.filter).query('({0}=ANY(groups))'.format(pggroupid));
			}
		}

		db.callback(function(err) {
			if (err)
				$.invalid(err);
			else {
				$.success();
				FUNC.refreshgroupsrolesdelay();
			}
		});
	});

	function applyfilter(builder, opt) {
		opt.id && builder.in('id', opt.id);
		opt.skipme && $.user && builder.where('id', '<>', $.user.id);
		opt.statusid && builder.where('statusid', opt.statusid);
		opt.contractid && builder.where('contractid', +opt.contractid);
		opt.directoryid && builder.where('directoryid', opt.directoryid);
		opt.directory && builder.gridfilter('directory', opt, String);
		opt.locality && builder.gridfilter('locality', opt, String);
		opt.language && builder.gridfilter('language', opt, String);
		opt.groupid && builder.gridfilter('groupid', opt, String);
		opt.company && builder.gridfilter('company', opt, String);
		opt.gender && builder.gridfilter('gender', opt, String);
		opt.language && builder.gridfilter('language', opt, String);
		opt.supervisor && builder.gridfilter('supervisor', opt, String);
		opt.deputy && builder.gridfilter('deputy', opt, String);
		opt.desktop && builder.gridfilter('desktop', opt, Number);
		opt.inactive && builder.query('inactive=' + (BOOL[opt.inactive] || 'false'));
		opt.active && builder.query('inactive={0} AND blocked={0}'.format(BOOL[opt.active] || 'false'));
		opt.blocked && builder.query('blocked=' + (BOOL[opt.blocked] || 'false'));
		opt.darkmode && builder.query('darkmode=' + (BOOL[opt.darkmode] || 'false'));
		opt.sa && builder.query('sa=' + (BOOL[opt.sa] || 'false'));
		opt.otp && builder.query('otp=' + (BOOL[opt.otp] || 'false'));
		opt.online && builder.query('online=' + (BOOL[opt.online] || 'false'));
		opt.q && builder.search('search', opt.q);
		opt.name && builder.gridfilter('name', opt, String);
		opt.firstname && builder.gridfilter('firstname', opt, String);
		opt.lastname && builder.gridfilter('lastname', opt, String);
		opt.middlename && builder.gridfilter('middlename', opt, String);
		opt.phone && builder.gridfilter('phone', opt, String);
		opt.email && builder.gridfilter('email', opt, String);
		opt.group && builder.query('$1=ANY (groups)', [opt.group]);
		opt.modified && builder.where('dtmodified', '>', opt.modified);
		opt.logged && builder.where('dtlogged', '<', opt.logged);
		opt.dtupdated && builder.gridfilter('dtupdated', opt, Date);
		opt.dtcreated && builder.gridfilter('dtcreated', opt, Date);
		opt.dtmodified && builder.gridfilter('dtmodified', opt, Date);
		opt.dtlogged && builder.gridfilter('dtlogged', opt, Date);
		return builder;
	}

});