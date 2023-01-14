NEWSCHEMA('Feedback', function(schema) {

	schema.action('list', {
		name: 'Feedback list',
		action: function($) {
			DB().list('op.tbl_feedback').autoquery($.query, 'id:UID,account,email,ua,ip,app,updatedby,iscomplete:Boolean,rating:Number,dtcreated:Date,dtupdated:Date', 'dtcreated_desc', 100).callback($.callback);
		}
	});

	schema.action('read', {
		name: 'Read feedback',
		params: '*id:UID',
		action: async function($) {
			var params = $.params;
			DB().read('op.tbl_feedback').id(params.id).error('@(Feedback not found)').callback($.callback);
		}
	});

	schema.action('update', {
		name: 'Update feedback',
		params: '*id:UID',
		input: 'iscomplete:Boolean',
		action: async function($, model) {
			var params = $.params;
			model.updatedby = $.user.name;
			model.dtupdated = NOW;
			DB().modify('op.tbl_feedback', model).id(params.id).error('@(Feedback not found)').callback($.done());
		}
	});

	schema.action('remove', {
		name: 'Remove feedback',
		params: '*id:UID',
		action: async function($) {
			var params = $.params;
			DB().remove('op.tbl_feedback').id(params.id).error('@(Feedback not found)').callback($.done());
		}
	});

});