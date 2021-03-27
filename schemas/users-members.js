NEWSCHEMA('Users/Members', function(schema) {

	schema.define('email', 'Email');

	schema.setQuery(function($) {
		DBMS().query('SELECT a.id, a.email, b.name, b.photo, a.dtcreated FROM tbl_user_member a LEFT JOIN tbl_user b ON b.email=a.email WHERE userid=' + PG_ESCAPE($.user.id)).callback($.callback);
	});

	schema.setSave(function($, model) {

		DBMS().count('tbl_user_member').where('userid', $.user.id).done($, function(response) {

			if (CONF.maxmembers && response > CONF.maxmembers) {
				$.invalid('@(You have exceed a maximum count of members)');
				return;
			}

			if ($.user.email === model.email) {
				$.invalid('@(You can\'t add your email address to your member list)');
				return;
			}

			var db = DBMS();

			db.check('tbl_user_member').where('userid', $.user.id).where('email', model.email);
			db.error('@(Email is already registered in your member list)', true);

			model.id = UID();
			model.userid = $.user.id;
			model.email = model.email;
			model.dtcreated = NOW;

			db.insert('tbl_user_member', model).where('email', model.email);
			db.log($, model, model.email);
			db.callback($.done());

			FUNC.clearcache($.user.id);
		});

	});

	schema.setRemove(function($) {
		var db = DBMS();
		db.read('tbl_user_member').fields('email').id($.id).where('userid', $.user.id).error(404).data(response => db.log($, null, response.email));
		db.remove('tbl_user_member').id($.id);
		db.callback($.done());
	});

});