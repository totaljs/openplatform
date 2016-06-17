// A simple authorization delegate
F.onAuthorize = function(req, res, flags, next) {

	var cookie = req.cookie(CONFIG('cookie'));
	if (!cookie)
		return next(false);

	var user = F.decrypt(cookie);
	if (!user || user.expire < F.datetime.getTime())
		return next(false);

	session = USERS.findItem('id', user.id);
	if (!session || session.blocked || session.resetcounter !== user.resetcounter)
		return next(false);

	session.datelogged = F.datetime;
	session.online = true;
	next(true, session);
};

// Sets online=false fo all users each 5 minute
F.on('service', function(interval) {
	if (interval % 5 !== 0)
		return;
	OPENPLATFORM.users.save();
	for (var i = 0, length = USERS.length; i < length; i++)
		USERS[i].online = false;
});