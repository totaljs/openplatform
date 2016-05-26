var OPENPLATFORM = {};

OPENPLATFORM.version = '1.0.0';

function OP_OPEN(selector) {
}

function OP_EXEC(selector, data, callback) {
}

function OP_SEND(selector, data) {
}

function OP_ON(name, callback) {
}

function OP_LIST(callback) {
}

function OP_PROFILE(callback) {
}

function OP_MEMBERS(callback) {
}

function OP_INFO(callback) {
}

window.addEventListener('message', function(e) {
	var data = JSON.parse(e.originalEvent.data);
	data.type = '';
	data.data = null;
});