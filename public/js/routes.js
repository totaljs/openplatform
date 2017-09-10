NAVIGATION.middleware('user', function(next) {
	WAIT(function() {
		return window.user !== EMPTYOBJECT;
	}, next);
});

ROUTE('/', ['user'], function() {
	SET('common.page', 'dashboard');
	SET('dashboard.current', null);
});

ROUTE('/account/', ['user'], function() {
	SET('common.page', 'account');
});

ROUTE('/settings/', ['user'], function() {
	if (user.sa)
		SET('common.page', 'settings');
	else
		REDIRECT('/');
});

ROUTE('/users/', ['user'], function() {
	if (user.sa)
		SET('common.page', 'users');
	else
		REDIRECT('/');
});

ROUTE('/apps/', ['user'], function() {
	if (user.sa)
		SET('common.page', 'apps');
	else
		REDIRECT('/');
});