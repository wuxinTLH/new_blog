// Only content-hashed build assets are immutable. Never cache HTML, API or snapshots here.
const CACHE = 'sakuramikku-assets-v1';
const MAX_ENTRIES = 64;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin ||
      !url.pathname.startsWith(`${scope.pathname}assets/`) ||
      !/-[\w-]{8,}\.[a-z0-9]+$/i.test(url.pathname) || url.search || event.request.headers.has('range')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.status === 200 && response.type === 'basic') {
      // Store the origin response unchanged; GitHub Pages controls HTTP cache headers.
      try {
        await cache.put(event.request, response.clone());
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map(key => cache.delete(key)));
      } catch { /* Quota/private-mode failure must never break loading. */ }
    }
    return response;
  })());
});
