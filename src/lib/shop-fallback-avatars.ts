/**
 * Default shop avatar when API/SEO has no shop_image.
 * Alternatives live in SHOP_FALLBACK_AVATAR_OPTIONS — preview:
 * /playground/shop-fallback-avatars
 */
export const SHOP_FALLBACK_AVATAR_OPTIONS = [
  {
    id: "awning-yellow",
    label: "Yellow awning",
    src: "/icons/shop-fallback-awning-yellow.png",
  },
  {
    id: "awning-blue",
    label: "Blue roof",
    src: "/icons/shop-fallback-awning-blue.png",
  },
  {
    id: "key",
    label: "Orange + key",
    src: "/icons/shop-fallback-key.png",
  },
] as const;

/** Wired ecom fallback (HomeTopBar / getShopSeo when shop has no image). */
export const SHOP_IMAGE_FALLBACK =
  "/icons/shop-fallback-awning-yellow.png" as const;

/** @deprecated Use SHOP_IMAGE_FALLBACK — kept for playground “before” label. */
export const SHOP_IMAGE_FALLBACK_CURRENT = "/icons/og-image.png";

export type ShopFallbackAvatarId =
  (typeof SHOP_FALLBACK_AVATAR_OPTIONS)[number]["id"];
