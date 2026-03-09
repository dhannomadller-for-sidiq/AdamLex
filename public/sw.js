// Service Worker for Court Workspace Push Notifications
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Handle push events (from server-sent push)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Court Hearing Reminder';
    const options = {
        body: data.body || 'You have a court hearing today.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag || 'court-hearing',
        data: { url: data.url || '/lawyer?tab=Workspace' },
        requireInteraction: true,
        vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Click on notification → open app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/lawyer?tab=Workspace';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('/lawyer') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
