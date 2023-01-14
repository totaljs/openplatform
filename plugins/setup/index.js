exports.install = function() {

	ROUTE('+GET    /setup/', '#setup/index');

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

	// Feedback
	ROUTE('+API    /setup/    -feedback                *Feedback   --> list');
	ROUTE('+API    /setup/    -feedback_read/{id}      *Feedback   --> read');
	ROUTE('+API    /setup/    +feedback_update/{id}    *Feedback   --> update');
	ROUTE('+API    /setup/    -feedback_remove/{id}    *Feedback   --> remove');

	ROUTE('+API    /setup/    -dashboard               *Dashboard  --> stats');
};

COMPONENTATOR('uisetup', 'exec,intranetcss,navlayout,importer,page,box,input,datagrid,loading,approve,notify,errorhandler,aselected,localize,locale,validate,directory,icons,colorpicker,edit,viewbox,preview,choose,selection,colorselector,menu,clipboard,miniform,message');