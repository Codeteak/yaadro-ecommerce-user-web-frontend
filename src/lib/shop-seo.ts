/**
 * Shop SEO identity (name + share image).
 *
 * Prefers the shared request shop resolve. Local / unresolved hosts fall back
 * to `GET /api/seo/metadata` with `NEXT_PUBLIC_DEFAULT_SHOP_ID` (legacy:
 * `NEXT_PUBLIC_SHOP_ID`). `cache()` dedupes metadata + page calls in the
 * same request.
 */

import { cache } from "react";
import {
  fetchShopSeo,
  type ResolvedShop,
} from "@/lib/api/storefront";
import { getResolvedRequestShop } from "@/lib/request-shop";
import { SHOP_IMAGE_FALLBACK } from "@/lib/shop-fallback-avatars";

export type ShopSeo = {
  name: string;
  /** Absolute or root-relative share image URL. */
  image: string;
  description: string;
  banners: { id: string; title: string; subtitle: string; image: string; href: string }[];
};

export const SHOP_SEO_FALLBACK: ShopSeo = {
  name: "Yaadro",
  image: SHOP_IMAGE_FALLBACK,
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

export const getShopSeo = cache(async function getShopSeo(): Promise<ShopSeo> {
  const resolved = await getResolvedRequestShop();
  if (resolved) return toSeo(resolved);

  try {
    const seo = await fetchShopSeo();
    if (seo) return toSeo(seo);
  } catch {
    // Fall through to Yaadro branding.
  }

  return SHOP_SEO_FALLBACK;
});
