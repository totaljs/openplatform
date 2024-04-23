const REG_REDIRECT = /\/(api|auth|setup|notify|verify|upload)\//i;

exports.install = function() {
	ROUTE('+GET /*', index);
};

ON('ready', function() {
	COMPONENTATOR('uiportal', 'exec,locale,menu,notify,features,shortcuts,loading,importer,tangular-initials,viewbox,page,tablegrid,errorhandler,ready,box,intranetcss,input,validate,preview,colorselector,miniform,approve,intro,message,rating,sounds,windows,detach,movable,datepicker,uibuilder,uistudio', true);
});

function index($) {

	if (REG_REDIRECT.test($.url)) {
		$.redirect('/');
		return;
	}

	var plugins = [];

	for (let key in PLUGINS) {
		let item = PLUGINS[key];
		item.portal && plugins.push(item.portal);
	}

	var view = $.view('#portal/index');
	view.repository.plugins = plugins.length ? plugins.join('\n') : '';
}
