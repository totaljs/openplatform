const STATUS = {
	'0': 'Available',
	'1': 'Busy',
	'2': 'Do not disturb',
	'3': 'Be right back',
	'4': 'Meeting',
	'5': 'Business trip',
	'6': 'Holiday',
	'7': 'Sick',
	'8': 'Off work'
};

NEWSCHEMA('Account/Status', function(schema) {

	schema.define('statusid', Number);
	schema.define('status', 'String(70)');

	schema.setSave(function($, model) {

		if ($.user.guest) {
			$.invalid('error-permissions');
			return;
		}

		if (model.statusid > 7) {
			$.invalid('statusid');
			return;
		}

		model.dtmodified = NOW;
		model.dtupdated = NOW;
		$.user.statusid = model.statusid;
		$.user.status = model.status;
		$.user.dtupdated = NOW;
		$.user.dtmodified = NOW;

		$.extend && $.extend(model);
		var db = DBMS();

		db.mod('tbl_user', model).id($.user.id);
		db.log($, model, STATUS[model.statusid + '']);

		EMIT('account/update', $.user.id);
		MAIN.session.refresh($.user.id, $.sessionid);
		$.success();
	});

});