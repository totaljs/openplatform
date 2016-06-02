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