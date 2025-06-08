const cacheName = 'frais-vocal-cache-v5';
const filesToCache = [
  '/',
  '/index.html',
  '/js/script.js',
  '/css/style.css',
  '/manifest.json'
];

self.addEventListener('install', e => {
  console.log('Service Worker installing...');
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => {
        console.log('Caching files...');
        return cache.addAll(filesToCache).catch(err => {
          console.warn('Some files failed to cache:', err);
          return Promise.resolve();
        });
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('Service Worker activating...');
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== cacheName) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Ne pas intercepter les requêtes vers des CDN externes
  if (e.request.url.includes('cdnjs.cloudflare.com') || 
      e.request.url.includes('cdn.')) {
    return; // Laisser passer normalement
  }
  
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.ok) {
          return response;
        }
        return caches.match(e.request);
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});