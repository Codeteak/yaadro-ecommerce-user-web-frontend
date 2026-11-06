/**
 * Shop SEO identity (name + share image).
 *
 * Prefers domain resolve on a real host. Local dev has no shop domain, so
 * it uses `GET /api/seo/metadata` with `NEXT_PUBLIC_SHOP_ID`.
 */

import { headers } from "next/headers";
import {
  fetchShopSeo,
  isLocalShopHost,
  resolveShopByDomain,
  type ResolvedShop,
} from "@/lib/api/storefront";

export type ShopSeo = {
  name: string;
  /** Absolute or root-relative share image URL. */
  image: string;
  description: string;
  banners: { id: string; title: string; subtitle: string; image: string; href: string }[];
};

const FALLBACK: ShopSeo = {
  name: "Yaadro",
  image: "/icons/og-image.png",
  description: "Fresh groceries, right at your door.",
  banners: [],
};

function toSeo(shop: ResolvedShop): ShopSeo {
  return {
    name: shop.name,
    image: shop.image,
    description: shop.description,
    banners: shop.banners,
  };
}

export async function getShopSeo(): Promise<ShopSeo> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
    const domain = host.split(":")[0] ?? "";
    if (domain && !isLocalShopHost(domain)) {
      const resolved = await resolveShopByDomain(domain);
      if (resolved) return toSeo(resolved);
    }
  } catch {
    // Request headers are unavailable during some prerenders.
  }

  try {
    const seo = await fetchShopSeo();
    if (seo) return toSeo(seo);
  } catch {
    // Fall through to Yaadro branding.
  }

  return FALLBACK;
}
