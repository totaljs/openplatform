$(document).ready(function() {

});

Tangular.register('urlencode', function(value) {
	return encodeURIComponent(value);
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

function success() {
	var el = $('#success');
	SETTER('loading', 'hide', 500);
	el.css({ right: '90%' }).delay(500).fadeIn(100).animate({ right: '2%' }, 1500, 'easeOutBounce', function() {
		setTimeout(function() {
			el.fadeOut(200);
		}, 800);
	});
}

jQuery.easing.easeOutBounce = function(e, f, a, h, g) {
	if ((f /= g) < (1 / 2.75)) {
		return h * (7.5625 * f * f) + a
	} else {
		if (f < (2 / 2.75)) {
			return h * (7.5625 * (f -= (1.5 / 2.75)) * f + 0.75) + a
		} else {
			if (f < (2.5 / 2.75)) {
				return h * (7.5625 * (f -= (2.25 / 2.75)) * f + 0.9375) + a
			} else {
				return h * (7.5625 * (f -= (2.625 / 2.75)) * f + 0.984375) + a
			}
		}
	}
};
