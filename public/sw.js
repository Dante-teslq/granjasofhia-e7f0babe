const CACHE_NAME = 'granja-sofhia-v2';
const STATIC_ASSETS = ['/', '/logo.jpg', '/favicon.ico', '/manifest.json', '/offline.html'];

const shouldBypassCache = (url, request) => {
  if (request.method !== 'GET') return true;

  // Never cache Vite/dev/runtime module assets (prevents stale React chunks)
  return (
    url.pathname.startsWith('/node_modules/.vite/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.searchParams.has('v')
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldBypassCache(url, request)) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip OAuth routes
  if (url.pathname.startsWith('/~oauth')) return;

  // Network First for backend/api calls
  if (url.origin !== self.location.origin || url.pathname.startsWith('/rest/') || url.hostname.includes('supabase')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache First for immutable static assets (images/fonts/styles only)
  if (request.destination === 'image' || request.destination === 'font' || request.destination === 'style') {
    event.respondWith(
      caches.match(request)
        .then((cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
        )
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Network First for HTML/navigation and scripts
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
