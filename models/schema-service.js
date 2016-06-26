const HEADERS = {};

NEWSCHEMA('Service').make(function(schema) {

	schema.define('event', 'String(100)');   // Event name
	schema.define('data', 'Object');         // Custom data (JSON)

	schema.setPrepare(function(name, value) {
		if (name === 'event')
			return value.toLowerCase();
	});

	schema.setSave(function(error, model, controller, callback) {

		if (!controller.app.publish[model.event]) {
			error.push('error-application-publish');
			return callback();
		}

		var arr = [];

		for (var i = 0, length = APPLICATIONS.length; i < length; i++) {
			var app = APPLICATIONS[i];
			if (!app.url_subscribe || !app.serviceworker || !app.subscribe[model.event] || app.id === controller.app.id)
				continue;
			arr.push(app);
		}

		if (!arr.length)
			return callback(SUCCESS(true, EMPTYARRAY));

		var apps = [];
		var data = JSON.stringify(model.$clean());

		HEADERS['x-openplatform'] = F.config.url;
		HEADERS['x-openplatform-user'] = controller.user.id;
		HEADERS['x-openplatform-id'] = controller.app.id;

		arr.wait(function(item, next) {

			if (item.secret)
				HEADERS_SECRET['x-openplatform-secret'] = item.secret;
			else if (HEADERS_SECRET['x-openplatform-secret'])
				delete HEADERS_SECRET['x-openplatform-secret'];

			U.request(item.serviceurl, ['post', 'json', 'dnscache', '< 1', 2000], data, function(err, response) {
				if (!err)
					apps.push(item.id);
				next();
			}, null, HEADERS);
		}, () => callback(SUCCESS(true, apps)));
	});
});