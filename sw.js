const CACHE_NAME = 'habit-tracker-v1';
const urlsToCache = [
  '/app',
  '/app.html',
  '/app.js',
  '/style.css',
  '/manifest.json'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache ouvert');
        return cache.addAll(urlsToCache.map(url => {
          // Gestion des erreurs pour chaque ressource
          return fetch(url).then(response => {
            if (!response.ok) {
              throw new Error(`Erreur ${response.status} pour ${url}`);
            }
            return cache.put(url, response);
          }).catch(err => {
            console.warn(`⚠️ Impossible de cacher ${url}:`, err);
          });
        }));
      })
      .then(() => {
        console.log('✅ Service Worker: Installation réussie');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur installation:', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activation réussie');
      return self.clients.claim();
    })
  );
});

// Stratégie de cache: Network First, puis Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes externes (API, CDN, etc.)
  const url = new URL(request.url);
  if (!url.origin.includes(self.location.origin) && 
      !url.pathname.startsWith('/app')) {
    return;
  }

  event.respondWith(
    // Essayer le réseau d'abord
    fetch(request)
      .then((response) => {
        // Si la réponse est valide, la mettre en cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si le réseau échoue, utiliser le cache
        return caches.match(request)
          .then((response) => {
            if (response) {
              console.log('📦 Service Worker: Réponse depuis le cache:', request.url);
              return response;
            }
            
            // Si aucune correspondance dans le cache, retourner une page offline
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/app');
            }
          });
      })
  );
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
