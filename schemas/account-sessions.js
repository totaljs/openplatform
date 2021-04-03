NEWSCHEMA('Account/Sessions', function(schema) {

	schema.setQuery(function($) {
		DBMS().find('tbl_user_session').fields('id,ip,ua,referrer,online,dtexpire,logged,locked,dtlogged,dtcreated').where('userid', $.user.id).sort('dtcreated', true).callback(function(err, response) {
			for (var i = 0; i < response.length; i++) {
				var item = response[i];
				if (item.id === $.sessionid)
					item.current = true;
			}
			$.callback(response);
		});
	});

	schema.setRemove(function($) {

		var id = $.id;
		var db = DBMS();
		var session = MAIN.session.sessions[id];
		var iscurrent = session && session.sessionid === $.sessionid;

		if (session)
			delete MAIN.session.sessions[id];

		db.one('tbl_user_session').fields('ua').id(id).where('userid', $.user.id).error('@(Invalid session identifier)').data(response => db.log($, null, response.ua));
		db.rem('tbl_user_session').id(id);
		db.callback($.done(iscurrent));
	});

});