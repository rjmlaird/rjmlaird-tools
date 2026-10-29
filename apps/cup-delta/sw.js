// Cache-first service worker. The whole app is precached on install, so it works offline.
// Bump VERSION whenever a file changes so old caches are replaced.
const VERSION = 'cup-delta-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/app.js',
  './js/compare.js',
  './js/diagnosis.js',
  './js/rules.js',
  './js/scales.js',
  './js/schema.js',
  './js/store.js',
  './js/taxonomy.js',
  './js/util.js',
  './js/ui/compare.js',
  './js/ui/controls.js',
  './js/ui/cup.js',
  './js/ui/cups.js',
  './js/ui/data.js',
  './js/ui/dom.js',
  './js/ui/flavour.js',
  './js/ui/taste.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() => caches.match('./index.html'))),
  );
});
