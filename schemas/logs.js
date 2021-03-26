NEWSCHEMA('Logs', function(schema) {

	schema.setQuery(function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().list('tbl_log').autofill($, 'id:uid,userid:string,rowid:string,type:string,ip:string,ua:string,username:string,data:string,message:string,dtcreated:date', null, 'dtcreated_desc', 100).callback($.callback);
	});

	schema.addWorkflow('clear', function($) {
		if ($.controller && FUNC.notadmin($))
			return;
		DBMS().query('TRUNCATE tbl_log RESTART IDENTITY').callback($.done());
	});

});