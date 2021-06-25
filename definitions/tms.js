// Misc
const universal = 'id:String,userid:String,ua:String,ip:String,dttms:Date';

// Account
NEWPUBLISH('account-save', 'Account');

// Group
const group = 'id:String,userid:String,ua:String,ip:String,name:String,note:String,apps:[String],dtcreated:Date';
NEWPUBLISH('groups-create', group);
NEWPUBLISH('groups-update', group + ',dtupdated:Date');
NEWPUBLISH('groups-remove', universal);

// Apps
NEWPUBLISH('apps-open', universal + ',name:String');
NEWPUBLISH('apps-create', 'Apps');
NEWPUBLISH('apps-update', 'Apps');
NEWPUBLISH('apps-remove', universal);

// Users
NEWPUBLISH('users-create', 'Users');
NEWPUBLISH('users-update', 'Users');
NEWPUBLISH('users-remove', universal);

// Helper
FUNC.tms = function($, data = {}) {
	var result = CLONE(data);

	result.ip = $.ip;
	result.ua = $.ua;
	result.dttms = NOW;
	$.user && (result.userid = $.user.id);

	return result;
};