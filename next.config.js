/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
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

module.exports = nextConfig

