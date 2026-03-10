import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { createHandlerBoundToURL } from 'workbox-precaching';

const CACHE_NAME = 'storyshare-v1';
const STORY_API_CACHE = 'storyshare-api-v1';
const IMAGE_CACHE = 'storyshare-images-v1';

// Precache webpack-generated assets (injected by workbox at build time)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// SPA navigation: serve index.html for all navigation requests
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/\/api\//],
});
registerRoute(navigationRoute);

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

// --- Background Sync for offline story submission ---
const bgSyncPlugin = new BackgroundSyncPlugin('story-queue', {
  maxRetentionTime: 24 * 60, // 24 hours
});

registerRoute(
  ({ url, request }) =>
    url.origin === 'https://story-api.dicoding.dev' &&
    url.pathname === '/v1/stories' &&
    request.method === 'POST',
  new NetworkFirst({
    cacheName: 'storyshare-post-v1',
    plugins: [bgSyncPlugin],
    fetchOptions: { credentials: 'same-origin' },
  }),
  'POST',
);

// --- Push Notification ---
self.addEventListener('push', (event) => {
  let data = {
    title: 'StoryShare',
    options: {
      body: 'Ada cerita baru untukmu!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        options: {
          body: payload.options?.body || data.options.body,
          icon: payload.options?.icon || data.options.icon,
          badge: payload.options?.badge || data.options.badge,
          tag: payload.options?.tag || 'storyshare-notification',
          data: payload.options?.data || {},
          actions: [
            {
              action: 'view',
              title: 'Lihat Cerita',
            },
            {
              action: 'close',
              title: 'Tutup',
            },
          ],
        },
      };
    } catch (_) {
      data.options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(data.title, data.options));
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
