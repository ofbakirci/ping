/* PING — service worker. Dead-simple cache-first with a versioned key.
 * Precaches the whole app so it runs fully offline after first load.
 * Bump CACHE to ship an update (old caches are pruned on activate).
 */
const CACHE = 'ping-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './levels.js',
  './audio.js',
  './manifest.json',
  './sw.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => {
      if (req.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});
