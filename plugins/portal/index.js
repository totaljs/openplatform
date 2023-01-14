exports.install = function() {
	ROUTE('+GET /*', index);
};

COMPONENTATOR('uiportal', 'exec,locale,menu,notify,features,shortcuts,loading,importer,tangular-initials,viewbox,page,tablegrid,errorhandler,ready,box,intranetcss,input,validate,preview,colorselector,miniform,approve,intro,message,rating,sounds,windows,detach');

function index() {
	var $ = this;
	if ($.url.match(/\/(api|auth|setup|notify|verify|upload)\//g))
		$.redirect('/');
	else
		$.view('#portal/index');
}
