exports.install = function() {
	ROUTE('+GET /*', index);
};

COMPONENTATOR('uiportal', 'exec,locale,menu,notify,features,shortcuts,loading,importer,tangular-initials,viewbox,page,tablegrid,errorhandler,ready,box,intranetcss,input,validate,preview,colorselector,miniform,approve,intro,message,rating,sounds,windows,detach,movable', true);

function index() {
	var $ = this;
	var plugins = [];

	for (var key in F.plugins) {
		var item = F.plugins[key];
		if (($.user.sa || !item.visible || item.visible($.user)) && item.type == 'portal') {
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

	plugins.quicksort('sortindex');

	if ($.url.match(/\/(api|auth|setup|notify|verify|upload)\//g))
		$.redirect('/');
	else
		$.view('#portal/index',plugins);

}
