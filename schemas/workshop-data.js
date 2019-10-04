NEWSCHEMA('Workshop/Data', function(schema) {

	schema.define('schemaid', UID, true);

	schema.setQuery(function($) {

		var schema = MAIN.schema.findItem('id', $.id);
		var fields = ($.query.fields || '').split(',');
		var select = ['id'];

		for (var i = 0; i < fields.length; i++) {

			var field = fields[i].split('.');
			if (field.length === 1) {
				if (schema.fields.findItem('name', field[0]));
					select.push(field[0]);
				continue;
			}

			var reg = /\./g;
			var dbfield = schema.fields.findItem('name', field[0]);

			if (dbfield.type === 'user') {
				select.push('(SELECT {1} FROM tbl_user {0} WHERE {0}.id={2} LIMIT 1) as "{3}"'.format('a' + i, field[1], field[0], fields[i].replace(reg, 'X')));
			} else if (dbfield.islinked) {
				var subfield = MAIN.schema.findItem('id', dbfield.type);
				if (subfield)
					select.push('(SELECT {1} FROM t_{0} {0} WHERE {0}.id={2} LIMIT 1) as "{3}"'.format(subfield.name, field[1], dbfield.name, fields[i].replace(reg, 'X')));
			}
		}

		DBMS().query('SELECT {0} FROM t_{1} WHERE isremoved=FALSE'.format(select.join(','), schema.name)).callback(function(err, response) {
			var output = {};
			output.items = response;
			$.callback(output);
		});
	});

});