/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

