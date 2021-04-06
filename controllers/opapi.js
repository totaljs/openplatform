exports.install = function() {

	// Global
	ROUTE('+API    /opapi/    -codelist                 *Codelist             --> query');
	ROUTE('+API    /opapi/    -meta                     *Codelist             --> meta');

	// Sign-in
	ROUTE('-API    /opapi/    +login                    *Users/Login          --> exec');
	ROUTE('-API    /opapi/    +login_otp                *Users/Login          --> otp');
	ROUTE('-API    /opapi/    +password                 *Users/Password       --> exec');

	// Account form
	ROUTE('+API    /opapi/    -account_read             *Account              --> read');
	ROUTE('+API    /opapi/    +account_save             *Account              --> check save (response)');
	ROUTE('+API    /opapi/    -account_totp             *Account/Totp         --> generate');
	ROUTE('+API    /opapi/    +account_totp_verify      *Account/Totp         --> verify');
	ROUTE('+API    /opapi/    +status                   *Account/Status       --> save');
	ROUTE('-API    /opapi/    -unlock                   *Account              --> unlock');

	// Users
	ROUTE('+API    /opapi/    -users                    *Users                --> query');
	ROUTE('+API    /opapi/    -users_read/id            *Users                --> read');
	ROUTE('+API    /opapi/    +users_insert             *Users                --> check insert (response)');
	ROUTE('+API    /opapi/    #users_update/id          *Users                --> check patch (response)');
	ROUTE('+API    /opapi/    -users_remove/id          *Users                --> remove');
	ROUTE('+API    /opapi/    +users_assign             *Users/Assign         --> exec');

	// Apps
	ROUTE('+API    /opapi/    -apps                     *Apps                 --> query');
	ROUTE('+API    /opapi/    -apps_meta                *Apps                 --> meta');
	ROUTE('+API    /opapi/    -apps_read/id             *Apps                 --> read');
	ROUTE('+API    /opapi/    +apps_insert              *Apps                 --> check refresh insert (response)');
	ROUTE('+API    /opapi/    +apps_update/id           *Apps                 --> check refresh update (response)');
	ROUTE('+API    /opapi/    -apps_remove/id           *Apps                 --> remove');
	ROUTE('+API    /opapi/    -dnsresolver              *Apps                 --> dnsresolver');

	// Groups
	ROUTE('+API    /opapi/    -groups                   *Users/Groups         --> query');
	ROUTE('+API    /opapi/    #groups_update            *Users/Groups         --> patch');
	ROUTE('+API    /opapi/    -groups_remove            *Users/Groups         --> remove');
	ROUTE('+API    /opapi/    -marketplace              *Codelist             --> marketplace');

	// Reports
	ROUTE('+API    /opapi/    -reports                  *Users/Reports        --> query');
	ROUTE('+API    /opapi/    +reports_insert           *Users/Reports        --> insert', 1024 * 2);
	ROUTE('+API    /opapi/    -reports_solved/id        *Users/Reports        --> solved');
	ROUTE('+API    /opapi/    -reports_remove/id        *Users/Reports        --> remove');

	// Dashboard
	ROUTE('+API    /opapi/    -dashboard                *Dashboard            --> read');
	ROUTE('+API    /opapi/    -dashboard_total          *Dashboard            --> total');
	ROUTE('+API    /opapi/    -dashboard_online         *Dashboard            --> online');
	ROUTE('+API    /opapi/    -dashboard_yearly/year    *Dashboard            --> yearly');

	// Settings
	ROUTE('+API    /opapi/    -settings                 *Settings             --> read');
	ROUTE('+API    /opapi/    +settings_save            *Settings             --> save');
	ROUTE('+API    /opapi/    +smtp                     *Settings/SMTP        --> exec');
	ROUTE('+API    /opapi/    +totalapi                 *Settings/TotalAPI    --> exec');

	// LDAP
	ROUTE('+API    /opapi/    -ldap                     *LDAP                 --> read');
	ROUTE('+API    /opapi/    -ldap_import              *LDAP                 --> import', [1000 * 60 * 5]);
	ROUTE('+API    /opapi/    +ldap_test                *LDAP                 --> test');
	ROUTE('+API    /opapi/    +ldap_save                *LDAP                 --> save');

	// Search
	ROUTE('+API    /opapi/    -search_companies         *Users                --> companies');
	ROUTE('+API    /opapi/    -search_locations         *Users                --> locations');
	ROUTE('+API    /opapi/    -search_positions         *Users                --> positions');
	ROUTE('+API    /opapi/    -search_groupids          *Users                --> groupids');

	// Sessions
	ROUTE('+API    /opapi/    -sessions                 *Account/Sessions     --> query');
	ROUTE('+API    /opapi/    -sessions_remove/id       *Account/Sessions     --> remove');

	// Others
	ROUTE('+API    /opapi/    -profile                  *Account              --> current');
	ROUTE('+API    /opapi/    -live                     *Account              --> live');
	ROUTE('+API    /opapi/    +notify/id                *Apps/Notifications   --> internal');
	ROUTE('+API    /opapi/    -badge/id                 *Apps/Badges          --> internal');
	ROUTE('+API    /opapi/    -reset/id                 *Apps                 --> reset');
	ROUTE('+API    /opapi/    -open/id                  *Apps                 --> run');
	ROUTE('+API    /opapi/    -mutenotifications/id     *Apps                 --> mute_notifications');
	ROUTE('+API    /opapi/    -mutesounds/id            *Apps                 --> mute_sounds');
	ROUTE('+API    /opapi/    -favorite/id              *Apps                 --> favorite');
	ROUTE('+API    /opapi/    +logger                   *Apps/Logs            --> insert');
	ROUTE('+API    /opapi/    +positions                *Apps/Positions       --> save');
	ROUTE('+API    /opapi/    +config_save/id           *Apps/Config          --> save');
	ROUTE('+API    /opapi/    -config_read/id           *Apps/Config          --> read');
	ROUTE('+API    /opapi/    -notifications            *Apps/Notifications   --> query');
	ROUTE('+API    /opapi/    -notifications_clear      *Apps/Notifications   --> clear');
	ROUTE('+API    /opapi/    -logs                     *Logs                 --> query');
	ROUTE('+API    /opapi/    -logs_clear               *Logs                 --> clear');

	// Members
	ROUTE('+API    /opapi/    -members                  *Users/Members        --> query');
	ROUTE('+API    /opapi/    +members_save             *Users/Members        --> save');
	ROUTE('+API    /opapi/    -members_remove/id        *Users/Members        --> remove');

	// OAuth 2.0
	ROUTE('+API    /opapi/    -oauth_query              *OAuth                --> query');
	ROUTE('+API    /opapi/    +oauth_insert             *OAuth                --> insert');
	ROUTE('+API    /opapi/    +oauth_update/id          *OAuth                --> update');
	ROUTE('+API    /opapi/    -oauth_remove/id          *OAuth                --> remove');
};