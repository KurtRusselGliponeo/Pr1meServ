self.addEventListener('install', (_event) => {
  console.log('Service worker installed.');
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated.');
  // Tell the active service worker to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A basic cache-first strategy or network-first strategy could be implemented here.
  // For offline-first capability, this intercepts network requests.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If we have a cached response, return it.
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, go to the network.
      return fetch(event.request).catch(() => {
        // Fallback for offline if the network request fails
        // return caches.match('/offline.html');
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
