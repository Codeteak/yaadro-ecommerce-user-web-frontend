module.exports = {
  globDirectory: 'out/',
  globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,svg,webp,woff2,json}'],
  swDest: 'out/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  mode: 'development',
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/storefront'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'storefront-api',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300,
        },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 120,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: ({ request }) =>
        request.destination === 'script' || request.destination === 'style',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
      },
    },
  ],
};
