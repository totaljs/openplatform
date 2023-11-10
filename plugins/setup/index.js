exports.install = function() {

	ROUTE('+GET    /setup/', setup);

	// Users
	ROUTE('+API    /setup/    -users                   *Users      --> list');
	ROUTE('+API    /setup/    -users_read/{id}         *Users      --> read');
	ROUTE('+API    /setup/    +users_create            *Users      --> create');
	ROUTE('+API    /setup/    +users_update/{id}       *Users      --> update');
	ROUTE('+API    /setup/    -users_remove/{id}       *Users      --> remove');
	ROUTE('+API    /setup/    -users_assign/{id}       *Users      --> assign');

	// Groups
	ROUTE('+API    /setup/    -groups                  *Groups     --> list');
	ROUTE('+API    /setup/    -groups_read/{id}        *Groups     --> read');
	ROUTE('+API    /setup/    +groups_create           *Groups     --> create');
	ROUTE('+API    /setup/    +groups_update/{id}      *Groups     --> update');
	ROUTE('+API    /setup/    -groups_remove/{id}      *Groups     --> remove');
	ROUTE('+API    /setup/    -groups_apps             *Groups     --> apps');

	// Apps
	ROUTE('+API    /setup/    -apps                    *Apps       --> list');
	ROUTE('+API    /setup/    -apps_read/{id}          *Apps       --> read');
	ROUTE('+API    /setup/    +apps_create             *Apps       --> create');
	ROUTE('+API    /setup/    +apps_update/{id}        *Apps       --> update');
	ROUTE('+API    /setup/    -apps_remove/{id}        *Apps       --> remove');
	ROUTE('+API    /setup/    -apps_download           *Apps       --> download');

	// Settings
	ROUTE('+API    /setup/    -settings                *Settings   --> read');
	ROUTE('+API    /setup/    +settings_save           *Settings   --> save');
	ROUTE('+API    /setup/    +settings_test           *Settings   --> test');
	ROUTE('+API    /setup/    -resources               *Settings   --> resources');

	// Feedback
	ROUTE('+API    /setup/    -feedback                *Feedback   --> list');
	ROUTE('+API    /setup/    -feedback_read/{id}      *Feedback   --> read');
	ROUTE('+API    /setup/    +feedback_update/{id}    *Feedback   --> update');
	ROUTE('+API    /setup/    -feedback_remove/{id}    *Feedback   --> remove');

	ROUTE('+API    /setup/    -dashboard               *Dashboard  --> stats');
};

ON('ready', function() {
	COMPONENTATOR('uisetup', 'exec,intranetcss,navlayout,importer,page,box,input,datagrid,loading,approve,notify,errorhandler,aselected,localize,locale,validate,directory,icons,colorpicker,edit,viewbox,preview,choose,selection,colorselector,menu,clipboard,miniform,message,datepicker', true);
});

function setup() {
	var $ = this;
	var plugins = [];

	for (var key in F.plugins) {
		var item = F.plugins[key];
		if (item.type == 'setup' && ($.user.sa || !item.visible || item.visible($.user))) {
			var obj = {};
			obj.id = item.id;
			obj.url = '/{0}/'.format(item.id);
			obj.sortindex = item.position;
			obj.name = TRANSLATOR($.user.language || '', item.name);
			obj.icon = item.icon;
			obj.color = item.color;
			obj.type = item.type;
			obj.import = item.import;
			obj.hidden = item.hidden;
			plugins.push(obj);
		}
	}

	plugins.quicksort('position');
	$.view('#setup/index', plugins);
}