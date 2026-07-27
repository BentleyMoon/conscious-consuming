/* Conscious Consuming — service worker.
   Goal: make the commons reachable offline (Phase A — real use happens in store aisles with no signal).
   Strategy: NETWORK-FIRST for everything same-origin, falling back to cache.
   - Online (including dev on localhost): you always get fresh data — no stale-bundle trap after a rebuild.
   - Offline: you get the last-seen version, including the data bundle.
   Local-first & private: caches live on your device; nothing is sent anywhere. */
const CACHE = 'cc-v2';
const CORE = [
  './', './index.html', './styles.css', './engine.js', './decision.js', './presentation.js', './app.js', './data/index.json', './data/presentation.json', './guides.js', './i18n.js',
  './manifest.webmanifest', './icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return; // never touch cross-origin (e.g. Open Food Facts)
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(m => m || (req.mode === 'navigate' ? caches.match('./index.html') : Promise.reject('offline'))))
  );
});
