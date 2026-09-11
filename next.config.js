/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
/** Set by `npm run build:static` / pages deploy. Plain `next build` keeps Route Handlers. */
const useStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
const apiProxyTarget = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://customer.yaadro.online'
).replace(/\/+$/, '');

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
  async rewrites() {
    // `fallback`: only proxy when no App Router handler matched.
    // Unauthenticated catalog GETs (products, categories, coupons, home-sections)
    // read DATABASE_URL first; cart/auth/checkout still proxy to customer API.
    return {
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

