const CACHE_NAME = 'phongnam-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './coop-module.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800;900&display=swap',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Some assets could not be precached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Audio files, fonts, and external scripts: Cache First for instant playback & offline
  if (url.pathname.endsWith('.mp3') || url.hostname.includes('gstatic') || url.hostname.includes('googleapis') || url.hostname.includes('fonts.')) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkResp => {
          if (networkResp && networkResp.status === 200) {
            const respClone = networkResp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
          }
          return networkResp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML and JS: Network First with Cache Fallback for instant load + always updated
  event.respondWith(
    fetch(req).then(networkResp => {
      if (networkResp && networkResp.status === 200) {
        const respClone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
      }
      return networkResp;
    }).catch(() => {
      return caches.match(req).then(cached => {
        if (cached) return cached;
        if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
