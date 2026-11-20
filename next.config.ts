import type { NextConfig } from "next";

/** Set by `npm run build:static` / Cloudflare Pages. Plain `next build` keeps the Node server. */
const useStaticExport = process.env.NEXT_STATIC_EXPORT === "true";

function shopApiOrigin(): string {
  const raw = (
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

const nextConfig: NextConfig = {
  // Static export is opt-in (Cloudflare Pages). EC2/Docker uses `next start`.
  ...(useStaticExport ? { output: "export" as const } : {}),
  // Trailing slashes help Cloudflare Pages (`/cart/index.html`).
  trailingSlash: useStaticExport,
  skipTrailingSlashRedirect: true,
  images: {
    // Static export / CF Pages cannot use the default optimizer.
    unoptimized: useStaticExport,
    remotePatterns: [
      { protocol: "https", hostname: "media.yaadro.online" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.gstatic.com" },
    ],
  },
  // Cache Components are for the Node server path; turn off for static export.
  ...(useStaticExport
    ? {}
    : {
        cacheComponents: true,
        partialPrefetching: true,
      }),
  reactCompiler: true,
  serverExternalPackages: useStaticExport ? undefined : ["pg"],
  async rewrites() {
    if (useStaticExport) return [];
    const origin = shopApiOrigin();
    if (!origin) return [];
    return [
      {
        source: "/shop-api/:path*",
        destination: `${origin}/:path*`,
      },
    ];
  },
  async headers() {
    if (useStaticExport) return [];
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
