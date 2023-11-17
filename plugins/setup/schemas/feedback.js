NEWACTION('Feedback/list', {
	name: 'Feedback list',
	action: function($) {
		DATA.list('op.tbl_feedback').autoquery($.query, 'id:UID,account,email,ua,ip,app,updatedby,iscomplete:Boolean,rating:Number,dtcreated:Date,dtupdated:Date', 'dtcreated_desc', 100).callback($);
	}
});

NEWACTION('Feedback/read', {
	name: 'Read feedback',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		DATA.read('op.tbl_feedback').id(params.id).error('@(Feedback not found)').callback($);
	}
});

NEWACTION('Feedback/update', {
	name: 'Update feedback',
	params: '*id:UID',
	input: 'iscomplete:Boolean',
	action: async function($, model) {
		var params = $.params;
		model.updatedby = $.user.name;
		model.dtupdated = NOW;
		DATA.modify('op.tbl_feedback', model).id(params.id).error('@(Feedback not found)').callback($.done());
	}
});

NEWACTION('Feedback/remove', {
	name: 'Remove feedback',
	params: '*id:UID',
	action: async function($) {
		var params = $.params;
		DATA.remove('op.tbl_feedback').id(params.id).error('@(Feedback not found)').callback($.done());
	}
});