global.USERS = [];

function User() {
	// Maximum length 50 characters
	this.id = '';
	this.alias = '';
	this.firstname = '';
	this.lastname = '';
	this.roles = {};
	this.applications = {};
	this.picture = '';
	this.phone = '';
	this.email = '';
	this.login = '';
	this.password = '';

	this.datecreated = null;
	this.datelogged = null;
	this.dateupdated = null;
	this.datelast = null;

	// Internal settings
	this.online = false;
	this.sounds = true;
	this.notifications = true;
}