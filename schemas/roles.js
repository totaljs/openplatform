NEWSCHEMA('Roles', function(schema) {

	schema.setQuery(function($) {

		if ($.controller && FUNC.notadmin($))
			return;

		DBMS().query('SELECT UNNEST(roles) as id, COUNT(1)::int4 as count FROM tbl_user_app GROUP BY UNNEST(roles)').callback($.callback);
	});

});