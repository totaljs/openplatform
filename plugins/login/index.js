exports.install = function() {
	ROUTE('-GET     /*', '#login/index');
	ROUTE('-POST    /api/login/    *Login   --> login');
	ROUTE('-POST    /api/reset/    *Login   --> reset');
	// ROUTE('-POST    /api/create/   *Login   --> create');
};

ON('ready', function() {
	COMPONENTATOR('uilogin', 'exec,locale,intranetcss,viewbox,errorhandler,message,input,validate,choose,enter,autofill', true);
});