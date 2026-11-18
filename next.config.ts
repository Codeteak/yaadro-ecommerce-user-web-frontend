import type { NextConfig } from "next";

function shopApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  if (!raw) return "";
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = shopApiOrigin();
    if (!origin) return [];
    return [
      {
        source: "/shop-api/:path*",
        destination: `${origin}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.yaadro.online" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.gstatic.com" },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
