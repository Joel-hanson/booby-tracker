const CACHE = 'nursing-v2';
const FILES = [
    './index.html',
    './manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});

// Handle notification close — no action needed, just prevents errors
self.addEventListener('notificationclose', () => { });


let timerInterval = null;

self.addEventListener('message', e => {
    if (e.data.type === 'START_TIMER') {
        if (timerInterval) clearInterval(timerInterval);
        const start = e.data.start;
        const side = e.data.side;

        timerInterval = setInterval(async () => {
            const elapsed = Math.floor((Date.now() - start) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = String(elapsed % 60).padStart(2, '0');
            const display = mins + ':' + secs;

            // Update notification
            const clients = await self.clients.matchAll();
            clients.forEach(c => c.postMessage({ type: 'TICK', elapsed }));

            // Refresh the notification with current time
            self.registration.getNotifications({ tag: 'nursing-timer' }).then(notifs => {
                notifs.forEach(n => n.close());
                self.registration.showNotification('🤱 Nursing — ' + display, {
                    body: (side === 'L' ? 'Left' : 'Right') + ' side · tap to return',
                    tag: 'nursing-timer',
                    silent: true,
                    renotify: false,
                    icon: './icon-192.png'
                });
            });
        }, 5000); // updates every 5s to avoid battery drain
    }

    if (e.data.type === 'STOP_TIMER') {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        self.registration.getNotifications({ tag: 'nursing-timer' }).then(n => n.forEach(x => x.close()));
    }
});

// Clicking notification brings app to focus
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length) return clients[0].focus();
        return self.clients.openWindow('./index.html');
    }));
});