const CACHE = 'alacena-v1';

// Injected by VitePWA at build time — array of {url, revision}
const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const urls = PRECACHE_MANIFEST.map(e => e.url);
      await cache.addAll(urls);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await clients.claim();
    })()
  );
});

// Cache-first for static assets (precached files)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests → serve index.html from cache (app shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match('index.html');
          return cached || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Static assets → cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })()
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'AlacenaApp', {
        body: data.body || '',
        icon: data.icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/', ...data.data },
        actions: data.actions || [],
        tag: data.tag || 'default',
        renotify: true,
        requireInteraction: true,
      })
    );
  } catch (e) {
    console.error('Push error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'push-click', data: event.notification.data });
          return;
        }
      }
      if (clients.openWindow) clients.openWindow(url);
    })
  );
});
