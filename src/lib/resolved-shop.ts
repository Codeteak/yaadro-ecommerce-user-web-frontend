/**
 * Client cache for domain → shop resolve (same keys as main `shopResolver`).
 * Used for x-shop-id, cart/wishlist scoping, and banner hydration.
 */

import { defaultShopId } from "@/lib/db/shop-id";

export const RESOLVED_SHOP_ID_STORAGE_KEY = "yaadro_resolved_shop_id";
export const RESOLVED_SHOP_HOST_STORAGE_KEY = "yaadro_resolved_shop_host";
export const RESOLVED_SHOP_NAME_STORAGE_KEY = "yaadro_resolved_shop_name";
export const RESOLVED_SHOP_IMAGE_STORAGE_KEY = "yaadro_resolved_shop_image";
export const RESOLVED_SHOP_BANNER_ENABLED_KEY = "yaadro_resolved_shop_banner_enabled";
export const RESOLVED_SHOP_BANNER_IMAGES_KEY = "yaadro_resolved_shop_banner_images";

export type CachedShopBanners = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
}[];

/**
 * Resolved domain shop (browser cache), else `NEXT_PUBLIC_DEFAULT_SHOP_ID`
 * (legacy: `NEXT_PUBLIC_SHOP_ID`).
 */
export function resolveClientShopId(): string {
  const fallback = defaultShopId();
  if (typeof window === "undefined") return fallback;
  try {
    const host = window.location.hostname;
    const cachedHost = window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY);
    const cachedId = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY)?.trim() ?? "";
    if (cachedId && cachedHost === host) return cachedId;
  } catch {
    // ignore
  }
  return fallback;
}

export function cacheResolvedShop(input: {
  host: string;
  id: string;
  name: string;
  image: string;
  bannerEnabled: boolean;
  banners: CachedShopBanners;
}) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESOLVED_SHOP_HOST_STORAGE_KEY, input.host);
    window.localStorage.setItem(RESOLVED_SHOP_ID_STORAGE_KEY, input.id);
    window.localStorage.setItem(RESOLVED_SHOP_NAME_STORAGE_KEY, input.name);
    window.localStorage.setItem(RESOLVED_SHOP_IMAGE_STORAGE_KEY, input.image);
    window.localStorage.setItem(
      RESOLVED_SHOP_BANNER_ENABLED_KEY,
      input.bannerEnabled ? "1" : "0",
    );
    window.localStorage.setItem(
      RESOLVED_SHOP_BANNER_IMAGES_KEY,
      JSON.stringify(input.banners),
    );
  } catch {
    // ignore
  }
}

export function readCachedShopBanners(): CachedShopBanners {
  if (typeof window === "undefined") return [];
  try {
    if (window.localStorage.getItem(RESOLVED_SHOP_BANNER_ENABLED_KEY) === "0") {
      return [];
    }
    const raw = window.localStorage.getItem(RESOLVED_SHOP_BANNER_IMAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CachedShopBanners[number] =>
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as { image?: string }).image === "string",
    );
  } catch {
    return [];
  }
}
