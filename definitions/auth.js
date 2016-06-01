const COOKIE = '__uop';
const EXPIRE = '5 days';
const SECRET = 'UsSer';

F.onAuthorize = function(req, res, flags, next) {

	var cookie = req.cookie(COOKIE);
	if (!cookie)
		return next(false);

	var user = F.decrypt(cookie, SECRET);
	if (!user || user.expire < F.datetime.getTime())
		return next(false);

	user = USERS.findItem('id', user.id);
	if (!user || user.blocked)
		return next(false);

	user.datelogged = F.datetime;
	user.online = true;

	next(true, user);
};