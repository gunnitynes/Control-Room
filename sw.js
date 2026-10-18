/* Control Room service worker: just enough to make the phone page installable.
   Network first (the site changes often and uses ?v= cache-busting); the cache is only an offline fallback. */
const CACHE = 'controlroom-shell-v1';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'icons/icon-192.png']).catch(() => {}))); });
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
