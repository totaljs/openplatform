$(document).ready(function() {

});

Tangular.register('photo', function(value) {
	if (!value)
		return '/img/face.jpg';
	return '/photos/' + value.replace(/@|\./g, '_') + '.jpg';
});

Array.prototype.pagination = function(max) {
	var length = this.length;
	var pages = Math.ceil(length / max);
	return { pages: pages, count: length };
};

Array.prototype.paginate = function(skip, take) {
	var arr = [];
	var self = this;
	for (var i = 0, length = self.length; i < length; i++) {
		if (arr.length >= take)
			break;
		if (i >= skip)
			arr.push(self[i]);
	}
	return arr;
};