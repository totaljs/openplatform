self.addEventListener('install', function(e) {
	// Perform install steps
	console.log('SW installed.');
});

self.addEventListener('activate', function(e) {
	console.log('SW activated.');
	self.count = 0;
	self.ready = true;
});

self.addEventListener('notificationclick', function (e) {
	self.count = 0;
	e.notification.close();
	e.waitUntil(clients.openWindow('/?notifications=1'));
});

self.addEventListener('push', notify);
self.addEventListener('fetch', notify);

function notify(e) {
	fetch(new Request('/api/profile/live/')).then(function(response) {
		return response.json();
	}).then(function(data) {
		if (data && typeof(data.countnotifications) === 'number') {
			if (data.countnotifications) {
				if (self.count !== data.countnotifications) {
					self.count = data.countnotifications;
					var title = '@{config.name}';
					var body = 'You have ' + self.count + ' unread ' + (self.count === 1 ? 'notification' : 'notifications') + '.';
					var icon = '/icon.png';
					var tag = 'notifications';
					e.waitUntil(self.registration.showNotification(title, { body: body, icon: icon, tag: tag }));
					return;
				}
			}
		}
		self.count = 0;
	});
}