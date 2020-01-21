NEWSCHEMA('Users/Team', function(schema) {

	schema.define('email', '[String]');

	schema.setQuery(function($) {
		DBMS().find('tbl_user_member').fields('email').where('userid', $.user.id).callback(function(err, response) {
			for (var i = 0; i < response.length; i++)
				response[i] = response[i].email;
			$.callback(response);
		});
	});

	schema.setSave(function($) {

		var addresses = $.model.email;

		if (CONF.maxmembers && addresses.length > CONF.maxmembers) {
			$.invalid('error-members-limit');
			return;
		}

		var db = DBMS();

		db.find('tbl_user_member').fields('id,email').where('userid', $.user.id).callback(function(err, response) {

			var remove = [];
			var change = false;

			for (var i = 0; i < addresses.length; i++) {
				var email = addresses[i];
				var member = response.findItem('email', email);
				if (member == null) {
					change = true;
					db.insert('tbl_user_member', { id: UID(), userid: $.user.id, email: email, dtcreated: NOW });
				} else
					member.is = true;
			}

			for (var i = 0; i < response.length; i++) {
				if (!response[i].is) {
					change = true;
					remove.push(response[i].id);
				}
			}

			FUNC.log('account/members', $.user.id, addresses.join(', '), $);

			remove.length && db.remove('tbl_user_member').in('id', remove);
			db.callback($.done());
			change && FUNC.clearcache($.user.id);
		});

	});

});