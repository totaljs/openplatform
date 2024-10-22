const REG_REDIRECT = /\/(api|auth|setup|notify|verify|upload)\//i;

exports.install = function() {
	ROUTE('+GET /*', index);
};

ON('ready', function() {
	COMPONENTATOR('uiportal', 'exec,locale,menu,notify,features,shortcuts,loading,importer,tangular-initials,viewbox,page,tablegrid,errorhandler,ready,box,intranetcss,input,validate,preview,colorselector,miniform,approve,intro,message,rating,sounds,windows,detach,movable,datepicker,uibuilder,uistudio,noscrollbar', true);
});

function index($) {

	if (REG_REDIRECT.test($.url)) {
		$.redirect('/');
		return;
	}

	let redirect = $.query.redirect;

	if (redirect) {

		// external redirect
		// try to find app

		let beg = redirect.indexOf('/', 10);
		let app = beg === -1 ? redirect : redirect.substring(0, beg);

		$.query.redirect = '';

		DATA.read('op.tbl_app').fields('id').search('url', app, 'beg').where('isremoved=FALSE AND isdisabled=FALSE AND (isexternal=TRUE OR isnewtab=TRUE)').error(404).callback(function(err, response) {

			if (err) {
				index($);
				return;
			}

			ACTION('Account/run', null, $).params({ appid: response.id }).user($.user).callback(function(err, response) {

				if (err) {
					index($);
					return;
				}

				var token = response.url.match(/(openplatform|ssid)=.*?(&|$)/)[0];

				if (token[token.length - 1] === '&')
					token = token.substring(0, token.length - 1);

				redirect = redirect + (redirect.includes('&') ? '&' : '?') + token;
				$.redirect(redirect);
			});

		});

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
