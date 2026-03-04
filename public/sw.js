const CACHE_NAME = 'granja-sofhia-v2';
const STATIC_ASSETS = ['/', '/logo.jpg', '/favicon.ico', '/manifest.json', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/~oauth')) return;

  const isViteDevRequest =
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/.vite/');

  if (isViteDevRequest) {
    event.respondWith(fetch(request));
    return;
  }

  const isApiRequest =
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/rest/') ||
    url.hostname.includes('supabase');

  if (isApiRequest) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  const isStaticAssetRequest =
    url.pathname.startsWith('/assets/') ||
    STATIC_ASSETS.includes(url.pathname) ||
    request.destination === 'image' ||
    request.destination === 'font';

  if (isStaticAssetRequest) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      ).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
  );
});

// Notify clients about updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
