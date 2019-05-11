function resizelayout() {
	var h = $(window).height();
	$('.scroller').each(function() {
		var el = $(this);
		var m = el.attrd('margin');

		if (m)
			m = +m;
		else
			m = 0;

		el.css('height', h - (el.offset().top + m));
	});

	var el = $('.marketplace');
	el.length && el.css({ height: WH - el.offset().top, width: el.parent().width() });
}

function onImageError(image) {
	// image.onerror = null;
	image.src = '/img/empty.png';
	return true;
}

ON('ready', function() {
	resizelayout();
	setTimeout(function() {
		$('body').rclass('invisible');
	}, 100);
});