const CACHE_NAME = 'md-preview-v6.16';
const RUNTIME_CACHE = 'md-preview-runtime-v6.16';

// 预缓存：首屏关键静态资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './iris/styles.css',
  './iris/css/base.css',
  './iris/css/layout.css',
  './iris/css/markdown.css',
  './iris/css/components.css',
  './iris/css/floating.css',
  './iris/css/responsive.css',
  './iris/css/galleries.css',
  './iris/css/editor.css',
  './iris/css/themes/themes.css',
  './iris/app.js',
  './iris/js/config.js',
  './iris/js/state.js',
  './iris/js/dom.js',
  './iris/js/ui.js',
  './iris/js/search.js',
  './iris/js/file-tree.js',
  './iris/js/markdown.js',
  './iris/js/editor.js',
  './iris/js/router.js',
  './iris/js/settings.js',
  './iris/js/debug.js',
  './iris/js/plugins/loader.js',
  './iris/js/renderers/mermaid.js',
  './iris/js/renderers/plantuml.js',
  './iris/js/renderers/apexcharts.js',
  './iris/js/renderers/diff.js',
  './iris/js/renderers/geo.js',
  './iris/js/renderers/embedded.js',
  './iris/js/renderers/katex.js',
  './iris/js/pkt/pkt-renderer.js',
  './iris/css/pkt/pkt.css',
  './iris/data/pkt/icons.svg',
  './iris/vendor/cytoscape/cytoscape.min.js',
  './iris/js/themes/theme-manager.js',
  './iris/vendor/marked.js',
  './iris/vendor/highlight.js/highlight.min.js',
  './iris/vendor/flexsearch.bundle.js',
  './iris/vendor/file-tree/prod.js',
  './iris/data/file-tree.json',
  './iris/data/search-index.json',
  './iris/icons/favicon-32.png',
  './iris/icons/apple-touch-icon.png',
  './iris/vendor/highlight.js/styles/github.css'
];

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  let successCount = 0;
  let failCount = 0;

  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      try {
        // 检查是否已缓存，避免重复请求
        const cached = await cache.match(url);
        if (cached) {
          successCount++;
          return;
        }
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    })
  );

  console.log('[SW] Precache done:', successCount, 'success,', failCount, 'failed');
}

self.addEventListener('install', event => {
  console.log('[SW] Installing v6.5...');
  event.waitUntil(
    precache()
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[SW] Precache error:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v6.5...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 资源类型分流策略
function isStaticAsset(url) {
  return /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)(\?|$)/.test(url) ||
         url.pathname.endsWith('/') ||
         url.pathname.endsWith('index.html');
}

function isMarkdownDoc(url) {
  return url.pathname.endsWith('.md');
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // 静态资源：stale-while-revalidate — 先返回缓存（快速），后台更新缓存
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        // 有缓存就先返回缓存，同时后台更新；无缓存则等待网络
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Markdown 文档：网络优先，离线降级到缓存
  if (isMarkdownDoc(url)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || new Response('离线模式下无法加载此文档', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
        })
    );
    return;
  }

  // 其他请求：缓存优先
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
