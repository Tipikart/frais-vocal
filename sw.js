const cacheName = 'frais-vocal-cache-v2'; // Change la version
const filesToCache = [
  '/',
  '/index.html',
  '/js/script.js', // Corrige le chemin
  '/css/style.css', // Ajoute le CSS
  '/manifest.json'
  // Retire les icônes qui n'existent pas
];

self.addEventListener('install', e => {
  console.log('Service Worker installing...');
  e.waitUntil(
    caches.open(cacheName)
      .then(cache => {
        console.log('Caching files...');
        return cache.addAll(filesToCache);
      })
      .catch(err => {
        console.error('Cache failed:', err);
        // Continue même si le cache échoue
        return Promise.resolve();
      })
  );
  // Force l'activation immédiate
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
  // Prend le contrôle immédiatement
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Si la requête réussit, retourne la réponse
        if (response.ok) {
          return response;
        }
        // Sinon essaie le cache
        return caches.match(e.request);
      })
      .catch(() => {
        // En cas d'erreur réseau, utilise le cache
        return caches.match(e.request);
      })
  );
});