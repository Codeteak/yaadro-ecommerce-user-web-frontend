/* Yaadro storefront service worker — installable PWA for mobile + desktop.
 * Network-first for pages, API, and hashed JS/CSS; cache for images.
 * Never cache HTML shells (they reference hashed chunks that vanish on deploy).
 * CACHE_VERSION bump clears old runtime caches on activate.
 */
/* Bump on every SW behavior change so activate() drops old runtime caches. */
const CACHE_VERSION = 'yaadro-pwa-v4';
const PRECACHE = `${CACHE_VERSION}-shell`;
const RUNTIME = `${CACHE_VERSION}-runtime`;
const IMAGES = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            /* optional shell asset */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('yaadro-pwa-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isNextStatic(url) {
  return url.pathname.startsWith('/_next/static/');
}

function isStaticAsset(url) {
  return (
    isNextStatic(url) ||
    /\.(?:js|css|woff2?|ttf|eot)$/i.test(url.pathname)
  );
}

function isImageRequest(request, url) {
  return (
    request.destination === 'image' ||
    /\.(?:png|jpe?g|gif|webp|svg|avif|ico)$/i.test(url.pathname)
  );
}

/** Network-first for API; never writes HTML/document responses to cache. */
async function networkFirstNoHtmlCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  const isDocument =
    request.mode === 'navigate' || request.destination === 'document';
  try {
    const fresh = await fetch(request);
    if (
      fresh &&
      fresh.ok &&
      request.method === 'GET' &&
      !isDocument
    ) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    if (isDocument) throw err;
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Network-first for hashed Next assets.
 * Cache-first caused post-deploy “Application error” when a tab kept serving
 * stale JS that no longer matched the live HTML/RSC graph.
 */
async function staticAssetNetworkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && request.method === 'GET') {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    if (fresh && fresh.status === 404) {
      await cache.delete(request).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok && request.method === 'GET') {
    cache.put(request, fresh.clone()).catch(() => {});
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Never cache cross-origin API/auth host traffic except images we explicitly handle.
  if (!isSameOrigin(url) && !isImageRequest(request, url)) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstNoHtmlCache(request, RUNTIME));
    return;
  }

  if (isSameOrigin(url) && isApiRequest(url)) {
    event.respondWith(networkFirstNoHtmlCache(request, RUNTIME));
    return;
  }

  if (isImageRequest(request, url)) {
    event.respondWith(cacheFirst(request, IMAGES));
    return;
  }

  if (isSameOrigin(url) && isStaticAsset(url)) {
    event.respondWith(staticAssetNetworkFirst(request, RUNTIME));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
