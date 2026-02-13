/* Minimal service worker for offline precache */
const CACHE_NAME = 'md-docx-pwa-v9';
const PRECACHE_URLS = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './libs/jszip.min.js',
  './libs/mermaid.min.js',
  './docx-templates.js',
  './tests/test-harness.html',
  './tests/tests.js',
  './tests/cases/basic.md',
  './tests/cases/headings.md',
  './tests/cases/table.md',
  './tests/cases/blockquote.md',
  './tests/cases/lists-nested.md',
  './tests/cases/code-mermaid.md',
  './tests/cases/large.md',
  './tests/cases/toc-links.md'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Network-first strategy for development (always fetch fresh content)
  // Falls back to cache only if network fails
  event.respondWith(
    fetch(req)
      .then((response) => {
        // Clone response to cache it
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(req).then((cached) => {
          return cached || new Response('Offline and not cached', { status: 503 });
        });
      })
  );
});
