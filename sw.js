const CACHE_NAME = 'md-preview-v3.0';
const RUNTIME_CACHE = 'md-preview-runtime';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'iris/styles.css',
  'iris/css/base.css',
  'iris/css/components.css',
  'iris/css/floating.css',
  'iris/css/layout.css',
  'iris/css/markdown.css',
  'iris/css/responsive.css',
  'iris/css/themes/themes.css',
  'iris/app.js',
  'iris/js/config.js',
  'iris/js/dom.js',
  'iris/js/ui.js',
  'iris/js/file-tree.js',
  'iris/js/markdown.js',
  'iris/js/router.js',
  'iris/js/search.js',
  'iris/js/settings.js',
  'iris/js/state.js',
  'iris/vendor/marked.js',
  'iris/vendor/flexsearch.bundle.js',
  'iris/icons/icon-192.png',
  'iris/icons/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing v3.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Opening cache:', CACHE_NAME);
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Precache completed');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Precache failed:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      console.log('[SW] Existing caches:', keys);
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Activated, claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put('./index.html', clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});