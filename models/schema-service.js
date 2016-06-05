const HEADERS = {};

HEADERS['x-openplatform'] = F.config.url;

NEWSCHEMA('Service').make(function(schema) {

	schema.define('event', 'String(100)');   // Event name
	schema.define('data', 'Object');         // Custom data (JSON)

	schema.setSave(function(error, model, options, callback) {

		var arr = [];

		for (var i = 0, length = APPLICATIONS.length; i < length; i++) {
			var app = APPLICATIONS[i];
			if (!app.serviceurl || !app.serviceworker || !app.events[model.event])
				continue;
			arr.push(app);
		}

		if (!arr.length)
			return callback(SUCCESS(true, 0));

		var count = 0;
		var data = JSON.stringify(model.$clean());

		HEADERS['x-openplatform-user'] = controller.user.id;

		arr.wait(function(item, next) {

			if (item.secret)
				HEADERS_SECRET['x-openplatform-secret'] = item.secret;
			else if (HEADERS_SECRET['x-openplatform-secret'])
				delete HEADERS_SECRET['x-openplatform-secret'];

			U.request(item.serviceurl, ['post', 'json'], data, function(err, response) {
				if (!err)
					count++;
				next();
			}, null, HEADERS);
		}, () => callback(SUCCESS(true, count)));
	});
});