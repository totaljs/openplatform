const REG_REDIRECT = /\/(api|auth|setup|notify|verify|upload)\//i;

exports.install = function() {
	ROUTE('+GET /*', index);
};

ON('ready', function() {
	COMPONENTATOR('uiportal', 'exec,locale,menu,notify,features,shortcuts,loading,importer,tangular-initials,viewbox,page,tablegrid,errorhandler,ready,box,intranetcss,input,validate,preview,colorselector,miniform,approve,intro,message,rating,sounds,windows,detach,movable,datepicker,uibuilder,uistudio', true);
});

function index($) {

	var plugins = [];

	for (var key in PLUGINS) {
		var item = PLUGINS[key];
		if (item.type == 'portal' && ($.user.sa || !item.visible || item.visible($.user))) {
			var obj = {};
			obj.id = item.id;
			obj.url = '/{0}/'.format(item.id);
			obj.sortindex = item.position;
			obj.name = TRANSLATE($.user.language || '', item.name);
			obj.icon = item.icon;
			obj.color = item.color;
			obj.type = item.type;
			obj.import = item.import;
			obj.hidden = item.hidden;
			plugins.push(obj);
		}
	}

	plugins.quicksort('sortindex');

	if (REG_REDIRECT.test($.url))
		$.redirect('/');
	else
		$.view('#portal/index',plugins);

}
