exports.install = function() {
	ROUTE('-GET     /*', '#login/index');
	ROUTE('-POST    /api/login/    *Login   --> login');
	ROUTE('-POST    /api/reset/    *Login   --> reset');
	// ROUTE('-POST    /api/create/   *Login   --> create');
};

COMPONENTATOR('uilogin', 'exec,locale,intranetcss,viewbox,errorhandler,message,input,validate,choose,enter,autofill', true);