/*
 * Pinpoint service worker: makes the app installable and the solo games playable offline.
 * - app code, data, flags and icons: from the cache first (they are versioned or never change)
 * - the data manifest and pages: from the network first, the cache when offline
 * Party Rooms need a connection and are left alone.
 */
const VERSION = 'pinpoint-v1';
const SHELL = ['/', '/play', '/explore', '/passport', '/play/guess-flag', '/play/daily', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheFirst = async (req) => {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
  return res;
};

const networkFirst = async (req, fallback) => {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req)) ?? (fallback ? await caches.match(fallback) : undefined) ?? Response.error();
  }
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/party/')) return;

  if (url.pathname === '/data/manifest.json') return event.respondWith(networkFirst(req));
  if (/^\/(_next\/static|data|flags|icons)\//.test(url.pathname)) return event.respondWith(cacheFirst(req));
  if (req.mode === 'navigate') return event.respondWith(networkFirst(req, '/'));
});
