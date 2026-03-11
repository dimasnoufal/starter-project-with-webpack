import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

const STORY_API_CACHE = 'storyshare-api-v1';
const IMAGE_CACHE = 'storyshare-images-v1';

// Langsung ambil kendali semua tab tanpa perlu reload manual
self.skipWaiting();
clientsClaim();

// Precache webpack-generated assets (injected by workbox at build time)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// --- Cache strategies ---

// Story API: NetworkFirst with cache fallback (enables offline)
registerRoute(
  ({ url }) => url.origin === 'https://story-api.dicoding.dev',
  new NetworkFirst({
    cacheName: STORY_API_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

// External images: CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

// Tile map layers: StaleWhileRevalidate
registerRoute(
  ({ url }) =>
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('opentopomap.org'),
  new StaleWhileRevalidate({
    cacheName: 'storyshare-tiles-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// --- Push Notification ---
// API sends: { "title": "...", "options": { "body": "..." } }
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received', event.data?.text());

  let title = 'StoryShare';
  let options = {
    body: 'Ada cerita baru untukmu!',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'storyshare-notif',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      // Format dari API: { title, options: { body } }
      if (payload.title) title = payload.title;
      if (payload.options?.body) options.body = payload.options.body;
      if (payload.options?.icon) options.icon = payload.options.icon;
    } catch (_) {
      options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification shown:', title))
      .catch((err) => console.error('[SW] showNotification failed:', err))
  );
});

// --- Notification click: open story detail ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const storyId = event.notification.data?.storyId;
  const urlToOpen = storyId ? `/#/stories/${storyId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    }),
  );
});

// --- Skip waiting on new SW ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
