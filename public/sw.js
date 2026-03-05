const CACHE_NAME = 'granja-sofhia-v4';
const STATIC_ASSETS = [
  '/',
  '/logo.jpg',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-167x167.png',
  '/icons/icon-180x180.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/icon-1024x1024.png'
];

// ── Helpers ──────────────────────────────────────────────────
const isViteDevAsset = (url) =>
  url.pathname.startsWith('/node_modules/.vite/') ||
  url.pathname.startsWith('/src/') ||
  url.pathname.startsWith('/@vite') ||
  url.pathname.startsWith('/@fs/') ||
  url.pathname.startsWith('/@id/') ||
  url.pathname.startsWith('/@react-refresh') ||
  url.searchParams.has('v');

const isApiCall = (url) =>
  url.pathname.startsWith('/rest/') ||
  url.hostname.includes('supabase') ||
  url.pathname.startsWith('/auth/');

const isStaticAsset = (request) =>
  ['image', 'font', 'style'].includes(request.destination);

const isScript = (request) =>
  request.destination === 'script' || request.url.endsWith('.js') || request.url.endsWith('.mjs');

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, OAuth, and Vite dev assets
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/~oauth')) return;
  if (isViteDevAsset(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Network First → API / data calls
  if (isApiCall(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache First → images, fonts, CSS
  if (isStaticAsset(request)) {
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

  // Cache First → JS/scripts (built assets, NOT Vite dev)
  if (isScript(request)) {
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

  // Stale While Revalidate → navigation / routes
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached || caches.match('/offline.html'));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match('/offline.html')))
  );
});

// ── Background Sync (queue offline actions) ──────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-actions') {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const queue = await cache.match('/__offline_queue__');
    if (!queue) return;

    const actions = await queue.json();
    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method || 'POST',
          headers: action.headers || { 'Content-Type': 'application/json' },
          body: action.body,
        });
      } catch (e) {
        // silently retry next sync
      }
    }
    await cache.delete('/__offline_queue__');
  } catch (e) {
    // silent
  }
}

// ── Skip waiting on user request ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
