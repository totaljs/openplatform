// Misc
const universal = 'id:String,userid:String,ua:String,ip:String,dttms:Date';

// Account
NEWPUBLISH('account_save', 'Account');

// Group
const group = 'id:String,userid:String,ua:String,ip:String,name:String,note:String,apps:[String],dtcreated:Date';
NEWPUBLISH('groups_create', group);
NEWPUBLISH('groups_update', group + ',dtupdated:Date');
NEWPUBLISH('groups_remove', universal);

// Apps
NEWPUBLISH('apps_open', universal + ',name:String');
NEWPUBLISH('apps_create', 'Apps');
NEWPUBLISH('apps_update', 'Apps');
NEWPUBLISH('apps_remove', universal);

// Users
NEWPUBLISH('users_create', 'Users');
NEWPUBLISH('users_update', 'Users');
NEWPUBLISH('users_remove', universal);

// Helper
FUNC.tms = function($, data = {}) {
	var result = CLONE(data);

	result.ip = $.ip;
	result.ua = $.ua;
	result.dttms = NOW;
	$.user && (result.userid = $.user.id);

	return result;
};