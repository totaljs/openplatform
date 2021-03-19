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
		var session = MAIN.session.sessions[id];
		if (session && session.userid === $.user.id) {
			DBMS().remove('tbl_user_session').id(id).done($, function() {
				var iscurrent = session.sessionid === $.sessionid;
				delete MAIN.session.sessions[id];
				$.success(true, iscurrent);
			});
		} else
			$.invalid('@(Invalid session identifier)');
	});

});