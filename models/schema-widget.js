NEWSCHEMA('Widget').make(function(schema) {

	schema.define('array', '[String(60)]');

	schema.setSave(function(error, model, controller, callback) {

		var arr = [];

		for (var i = 0, length = model.array.length; i < length; i++) {
			var item = model.array[i].split('X');
			var idapp = item[0].parseInt();

			if (!controller.user.applications[idapp]) {
				error.push('error-user-widgets');
				return callback();
			}

			var app = APPLICATIONS.findItem('internal', idapp);
			if (!app) {
				error.push('error-user-widgets');
				return callback();
			}

			var widget = app.widgets.findItem('internal', item[1].parseInt());
			if (!widget) {
				error.push('error-user-widgets');
				return callback();
			}

			arr.push(model.array[i]);
		}

		controller.user.widgets = arr;
		OPENPLATFORM.users.save();
		callback(SUCCESS(true, arr));
	});

});