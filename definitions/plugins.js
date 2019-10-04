const Fs = require('fs');

MAIN.plugins = [];

FILE('/plugins.css', function(req, res) {
	var builder = [];
	for (var i = 0; i < MAIN.plugins.length; i++) {
		var item = MAIN.plugins[i];
		item.css && builder.push(item.css);
	}
	res.content(200, builder.join(''), 'text/css');
});

function compile(html) {

	var beg = -1;
	var end = -1;

	var body_script = '';
	var body_editor = '';
	var body_style = '';
	var body_html = '';
	var body_meta = '';
	var raw = html;

	while (true) {

		beg = html.indexOf('<script', end);
		if (beg === -1)
			break;

		end = html.indexOf('</script>', beg);
		if (end === -1)
			break;

		var body = html.substring(beg, end);
		var type = body.substring(0, beg);

		if (type.indexOf('html') !== -1 || type.indexOf('plain') !== -1) {
			end += 9;
			continue;
		}

		beg = body.indexOf('>') + 1;
		raw = raw.replace(body + '</script>', '');
		body = body.substring(beg);
		body = body.trim();

		if (type.indexOf('meta') !== -1)
			body_meta = body;
		else if (type.indexOf('editor') !== -1)
			body_editor = body;
		else
			body_script = body;

		end += 9;
	}

	beg = raw.indexOf('<style');
	if (beg !== -1) {
		end = raw.indexOf('</style>');
		var tmp = raw.substring(raw.indexOf('>', beg) + 1, end);
		raw = raw.replace(raw.substring(beg, end + 8), '');
		body_style = tmp.trim();
	}

	if (!body_html) {
		raw = raw.trim();
		raw && (body_html = raw);
	}

	var obj = {};
	obj.jseditor = U.minifyScript(body_editor);
	obj.js = U.minifyScript(body_script);
	obj.css = U.minifyStyle(body_style);
	obj.html = U.minifyHTML(body_html);

	obj.meta = {};
	var fn = new Function('exports', body_meta.trim());
	fn(obj.meta);
	return obj;
}

function loadplugins() {
	U.ls(PATH.public('plugins'), function(files) {
		MAIN.plugins = [];
		files.wait(function(item, next) {
			Fs.readFile(item, function(err, data) {
				var obj = compile(data.toString('utf8'));
				obj.meta.id = U.getName(item).replace(/\.html/g, '');
				MAIN.plugins.push(obj);
				next();
			});
		});
	});
}

ON('plugins/refresh', loadplugins);
loadplugins();