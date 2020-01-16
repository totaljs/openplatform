NEWSCHEMA('Users/Team', function(schema) {

	schema.define('email', '[String]');

	schema.setSave(function($) {

		var db = DBMS();

		db.find('tbl_user_member').where('userid', $.user.id).callback(function(err, response) {

			var addresses = $.model.email;

			for (var i = 0; i < addresses.length; i++) {
				var email = addresses[i];
				var member = response.findItem('email', email);
				if (member == null)
					db.insert('tbl_user_member', { id: UID(), userid: $.user.id, email: email, dtcreated: NOW });
				else
					member.is = true;
			}

		});

	});

});