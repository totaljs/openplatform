F.on('ready', function() {
	OPENPLATFORM.users.load();
	OPENPLATFORM.applications.load();
});

F.on('service', function(counter) {

	// Realods all applications each 5 minutes
	if (counter % 5 === 0)
		OPENPLATFORM.applications.reload();

});