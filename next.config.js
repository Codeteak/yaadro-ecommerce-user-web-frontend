/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
/** Set by `npm run build:static` / pages deploy. Plain `next build` keeps Route Handlers. */
const useStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
const apiProxyTarget = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://customer.yaadro.online'
).replace(/\/+$/, '');
/** Customer API origin for Socket.IO (never under `/api`). */
const apiSocketOrigin = apiProxyTarget.replace(/\/api\/?$/i, '');

const baseConfig = {
  reactStrictMode: true,
  // Static export is opt-in (Cloudflare Pages). Default prod build allows GET DB API routes.
  output: useStaticExport ? 'export' : undefined,
  // Trailing slashes are for Cloudflare Pages static export (`/cart/index.html`).
  // In `next dev` they make `/_next/static/chunks/*.js` (and layout.css) miss the
  // webpack asset handler and 404 as App Router pages (compiles `/_not-found`).
  trailingSlash: useStaticExport,
  skipTrailingSlashRedirect: true,
  // Dev: allow loading `/_next/static/*` when the site is opened via a tunnel hostname
  // (e.g. Cloudflare). Without this, chunks/CSS can 404/500 and the browser may throw
  // SyntaxError while parsing HTML or error bodies as JavaScript (often reported as layout.js).
  allowedDevOrigins: ['cu.yaadro.online', 'cus.yaadro.online'],
  images: {
    // Allow images from any domain by bypassing Next.js image optimization
    // This allows all domains but images won't be optimized by Next.js
    unoptimized: true,
    
    // Alternative: If you want Next.js optimization but allow all domains,
    // you can use a custom loader (commented out below)
    // loader: 'custom',
    // loaderFile: './utils/imageLoader.js',
  },
}

/** Node server (dev + EC2 `next start`): proxy unmatched /api/* to customer API. */
const serverConfig = {
  ...baseConfig,
  experimental: {
    ...(baseConfig.experimental || {}),
    serverComponentsExternalPackages: ['pg'],
  },
  async headers() {
    // Cloudflare Pages uses public/_headers; EC2 `next start` needs these here.
    // First matching source wins — keep /_next/static before the catch-all.
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
      {
        // Documents / RSC payloads — kill year-long s-maxage that sticks old builds at CF.
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
  async rewrites() {
    // `fallback`: only proxy when no App Router handler matched.
    // Unauthenticated catalog GETs (products, categories, coupons, home-sections)
    // read DATABASE_URL first; cart/auth/checkout still proxy to customer API.
    // Socket.IO must be proxied always (beforeFiles) so same-origin catalog
    // realtime works when the shop and API share a host (customer.yaadro.online).
    return {
      beforeFiles: [
        {
          source: '/socket.io',
          destination: `${apiSocketOrigin}/socket.io`,
        },
        {
          source: '/socket.io/:path*',
          destination: `${apiSocketOrigin}/socket.io/:path*`,
        },
      ],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${apiProxyTarget}/api/:path*`,
        },
      ],
    };
  },
};

module.exports = isProduction && useStaticExport ? baseConfig : serverConfig;

