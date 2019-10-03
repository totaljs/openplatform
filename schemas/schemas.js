const BLACKLIST_FIELDS = { id: 1, schemaid: 1, creatorid: 1, updaterid: 1, removerid: 1, permissions: 1, isremoved: 1, isinactive: 1, dtcreated: 1, dtupdated: 1, dtremoved: 1 };

NEWSCHEMA('Schema', function(schema) {

	schema.define('label', 'String(50)', true);
	schema.define('group', 'String(50)');
	schema.define('note', 'String(500)');
	schema.define('icon', 'String(20)');
	schema.define('color', 'String(7)');
	schema.define('permissions', '[String]');
	schema.define('fieldid', 'UID')(null);
	schema.define('x', Number);
	schema.define('y', Number);

	schema.setInsert(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();
		var db = DBMS();
		model.id = UID();
		model.name = model.label.slug().replace(/\-/g, '');
		model.dtcreated = NOW;
		model.isremoved = false;

		if (!model.permissions.length)
			model.permissions = null;

		var query = 'CREATE TABLE t_{0} (id varchar(25), schemaid varchar(25), statusid varchar(25), creatorid varchar(25), updaterid varchar(25), removerid varchar(25), permissions _varchar, istest BOOLEAN DEFAULT FALSE, isremoved BOOLEAN DEFAULT FALSE, isinactive BOOLEAN DEFAULT FALSE, dtcreated timestamp, dtstatus timestamp, dtupdated timestamp, dtremoved timestamp, PRIMARY KEY(id))'.format(model.name);
		db.query(query);
		db.error();
		db.insert('tbl_schema', model);
		db.callback(function() {
			$.success(model.id);
			refreshmeta();
			FUNC.log('schemas/create', model.id, model.name, $);
			EMIT('schemas/create', model.id);
		});

	});

	schema.setUpdate(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();

		model.dtupdated = NOW;

		if (!model.permissions.length)
			model.permissions = null;

		DBMS().modify('tbl_schema', model).where('id', $.id).error('error-schemas-404').callback(function(err, response) {
			if (response) {
				$.success(model.id);
				refreshmeta();
				FUNC.log('schemas/update', $.id, model.name, $);
				EMIT('schemas/update', $.id);
			} else
				$.invalid(err);
		});

	});

	schema.setQuery(function($) {
		if ($.user.sa)
			$.callback(MAIN.schema);
		else
			$.invalid('error-permissions');
	});

	// @TODO: MISSING REMOVE

});

NEWSCHEMA('Schema/Position', function(schema) {

	schema.define('x', Number);
	schema.define('y', Number);

	schema.setUpdate(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var model = $.clean();
		var schema = MAIN.schema.findItem('id', $.id);
		if (schema) {
			schema.x = model.x;
			schema.y = model.y;
			DBMS().modify('tbl_schema', model).where('id', $.id).callback($.done());
		} else
			$.invalid('error-schemas-404');
	});
});

NEWSCHEMA('Schema/Field', function(schema) {

	// schema.define('name', 'String(50)');
	schema.define('label', 'String(50)', true);
	schema.define('type', 'String(50)', true);
	schema.define('note', 'String(500)');
	schema.define('length', Number);
	schema.define('position', Number);
	schema.define('permissions', '[String]');
	schema.define('items', '[String]');
	schema.define('required', Boolean);
	schema.define('default', Boolean);

	// For image type only
	schema.define('width', Number);
	schema.define('height', Number);

	schema.setInsert(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var schema = MAIN.schema.findItem('id', $.params.schemaid);
		if (schema == null) {
			$.invalid('error-schemas-404');
			return;
		}

		var model = $.clean();

		if (BLACKLIST_FIELDS[model.name]) {
			$.invalid('error-schemas-field');
			return;
		}

		model.id = UID();
		model.dtcreated = NOW;
		model.schemaid = schema.id;
		model.islinked = false;

		if (model.type !== 'text' && model.type !== 'capitalize')
			model.length = 0;

		model.name = 'f_' + GUID(6);

		var type = maketype(model);
		if (!type) {
			$.invalid('error-schemas-type');
			return;
		}

		var defaultid = model.default;
		model.default = undefined;

		var db = DBMS();
		db.begin();
		db.query('ALTER TABLE t_{0} ADD COLUMN "{1}" {2}'.format(schema.name, model.name, type));
		db.query('comment on column t_{0}.{1} is {2}'.format(schema.name, model.name, PG_ESCAPE(model.label + ' --> ' + model.type)));
		db.insert('tbl_schema_field', model);
		defaultid && db.modify('tbl_schema', { fieldid: model.id }).where('id', schema.id);
		db.commit();
		db.callback(function(err) {
			if (err) {
				$.invalid(err);
			} else {
				FUNC.log('schemas/fields/create', model.id, schema.name + '.' + model.name + ' (' + type + ')', $);
				EMIT('schemas/fields/create/', schema.id, schema.id);
				$.success(model.id);
				refreshmeta();
			}
		});
	});

	schema.setUpdate(function($) {

		if (!$.user.sa) {
			$.invalid('error-permissions');
			return;
		}

		var schema = MAIN.schema.findItem('id', $.params.schemaid);
		if (schema == null) {
			$.invalid('error-schemas-404');
			return;
		}

		var model = $.clean();

		if (BLACKLIST_FIELDS[model.name]) {
			$.invalid('error-schemas-field');
			return;
		}

		model.dtupdated = NOW;
		model.islinked = false;

		var type = maketype(model);
		if (!type)
			return;

		var field = schema.fields.findItem('id', $.params.id);
		// var isrename = field.name !== model.name;

		var defaultid = model.default;
		model.default = undefined;

		var db = DBMS();

		db.query('ALTER TABLE t_{0} ALTER COLUMN "{1}" TYPE {2}'.format(schema.name, field.name, type));
		db.query('comment on column t_{0}.{1} is {2}'.format(schema.name, field.name, PG_ESCAPE(model.label + ' --> ' + model.type)));

		//if (isrename)
		//	db.query('ALTER TABLE t_{0} RENAME "{1}" TO "{2}"'.format(schema.name, field.name, model.name));

		db.modify('tbl_schema_field', model).where('id', $.params.id);
		defaultid && db.modify('tbl_schema', { fieldid: $.params.id }).where('id', schema.id);
		db.callback(function(err) {
			if (err) {
				$.invalid(err);
			} else {
				FUNC.log('schemas/fields/update', $.params.id, schema.name + '.' + model.name + ' (' + type + ')', $);
				EMIT('schemas/fields/update/', $.params.id, schema.id);
				$.success(model.id);
				refreshmeta();
			}
		});
	});

});

function maketype(model) {
	var type = '';
	switch (model.type) {
		case 'email':
			type = 'VARCHAR(120)';
			model.length = 0;
			break;
		case 'ip':
			type = 'CIDR';
			model.length = 0;
			break;
		case 'url':
			type = 'VARCHAR(500)';
			model.length = 0;
			break;
		case 'file':
		case 'image':
			type = 'VARCHAR(60)';
			model.length = 0;
			break;
		case 'zip':
			type = 'VARCHAR(10)';
			model.length = 0;
			break;
		case 'phone':
			type = 'VARCHAR(20)';
			model.length = 0;
			break;
		case 'priority':
			type = 'INT2';
			model.length = 0;
			break;
		case 'number':
			type = 'INT4';
			model.length = 0;
			break;
		case 'decimal':
			type = 'FLOAT4';
			model.length = 0;
			break;
		case 'tags':
			type = '_varchar';
			model.length = 0;
			break;
		case 'boolean':
			type = 'BOOLEAN';
			model.length = 0;
			break;
		case 'date':
			type = 'timestamp';
			model.length = 0;
			break;
		case 'html':
		case 'markdown':
			type = 'TEXT';
			model.length = 0;
			break;
		case 'text':
		case 'capitalize':
			type = model.length ? 'VARCHAR({0})'.format(model.length || 50) : 'TEXT';
			break;
		case 'user':
			type = 'VARCHAR(25)'; // UID
			model.length = 0;
			break;
		default:
			var subschema = MAIN.schema.findItem('id', model.type);
			if (subschema == null)
				return '';
			model.islinked = true;
			model.length = 0;
			type = 'VARCHAR(25)'; // UID
			break;
	}
	return type;
}

NEWSCHEMA('Schema/State', function(schema) {
	schema.define('nextid', '[UID]');
	schema.define('name', 'String(50)', true);
	schema.define('note', 'String(500)');
	schema.define('position', Number);
	schema.define('isprev', Boolean);
	schema.define('ismain', Boolean);
	schema.define('permissions', '[String]');
});

function refreshmeta() {
	var db = DBMS();
	db.find('tbl_schema').set('schemas').sort('label');
	db.find('tbl_schema_field').set('fields').sort('position').sort('dtcreated');
	db.find('tbl_schema_status').set('statuses').sort('position').sort('dtcreated');
	db.callback(function(err, response) {

		for (var i = 0; i < response.schemas.length; i++) {
			var schema = response.schemas[i];
			schema.fields = [];
			schema.states = [];

			for (var j = 0; j < response.fields.length; j++) {
				var item = response.fields[j];
				if (item.schemaid === schema.id) {
					item.default = schema.fieldid === item.id;
					schema.fields.push(response.fields[j]);
				}
			}

			for (var j = 0; j < response.statuses.length; j++) {
				var item = response.statuses[j];
				if (item.schemaid === schema.id)
					schema.statuses.push(response.statuses[j]);
			}
		}

		MAIN.schema = response.schemas;
	});
}

ON('ready', refreshmeta);