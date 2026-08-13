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
  // Clean URLs (`/cart`, `/product`, etc.) export as `/cart/index.html`, `/product/index.html`.
  // Cloudflare Pages serves directory indexes; `public/_redirects` handles SPA deep links.
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  // Dev: allow loading `/_next/static/*` when the site is opened via a tunnel hostname
  // (e.g. Cloudflare). Without this, chunks/CSS can 404/500 and the browser may throw
  // SyntaxError while parsing HTML or error bodies as JavaScript (often reported as layout.js).
  allowedDevOrigins: ['cu.yaadro.online'],
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

/** Dev-only: proxy /api/* to the real backend so serviceability cookies are same-origin. */
const devOnlyConfig = {
  ...baseConfig,
  // Keep `pg` external for Route Handlers that read DATABASE_URL.
  experimental: {
    ...(baseConfig.experimental || {}),
    serverComponentsExternalPackages: ['pg'],
  },
  async rewrites() {
    // `fallback`: only proxy when no App Router handler matched.
    // Lets GET app/api/storefront/products|categories use DATABASE_URL locally,
    // while cart/auth/checkout still proxy to the upstream API.
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

module.exports = isProduction && useStaticExport ? baseConfig : isProduction ? {
  ...baseConfig,
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
} : devOnlyConfig;

