/**
 * Public shop lookup. Catalog reads stay in `storefront.ts`.
 * Cache-invalidation routes are server-only and are not called from the browser.
 */

import { publicGet } from "@/lib/api/client";

export function resolveShopByDomain(domain: string, signal?: AbortSignal) {
  return publicGet<unknown>("/api/shops/resolve-by-domain", {
    query: { domain },
    shopId: null,
    signal,
  });
}

export function getSeoMetadata(
  pageType: "shop" | "product",
  slug?: string,
  signal?: AbortSignal,
) {
  return publicGet<unknown>("/api/seo/metadata", {
    query: { pageType, slug },
    signal,
  });
}
