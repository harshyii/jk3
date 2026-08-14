const CACHE_NAME = 'site-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/css/bootstrap.min.css',
  '/src/css/app.css',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Strategy for JSON files & API endpoints: Network-first (fallback to cache)
  if (requestUrl.pathname.endsWith('.json') || requestUrl.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache if offline or network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Strategy for static assets: Cache-first (fallback to network with error catch)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch((err) => {
        console.warn('Service Worker fetch failed for:', event.request.url, err);
        // Returning a generic Response object prevents unhandled promise rejections
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
