F.on('ready', function() {
	F.wait('settings');
	OPENPLATFORM.settings.load(function() {
		F.wait('settings');
		F.wait('users');
		F.wait('applications');
		OPENPLATFORM.users.load(() => F.wait('users'));
		OPENPLATFORM.applications.load(() => F.wait('applications'));
	});
});

F.on('service', function(counter) {
	// Realods all applications each 5 minutes
	if (counter % 5 === 0)
		OPENPLATFORM.applications.reload();
});