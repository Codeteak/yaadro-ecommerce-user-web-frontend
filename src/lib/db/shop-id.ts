const SHOP_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShopUuid(value: string): boolean {
  return SHOP_UUID.test(value);
}

/**
 * Local / fallback shop UUID only.
 * Prefer `NEXT_PUBLIC_DEFAULT_SHOP_ID`; still accept legacy `NEXT_PUBLIC_SHOP_ID`.
 * Production multi-shop resolves from the request hostname instead.
 */
export function defaultShopId(): string {
  const primary = process.env.NEXT_PUBLIC_DEFAULT_SHOP_ID?.trim() ?? "";
  if (primary) return primary;
  return process.env.NEXT_PUBLIC_SHOP_ID?.trim() ?? "";
}

/** Shop id from env (or an explicit raw value). Rejects non-UUIDs. */
export function requireShopId(raw = defaultShopId()): string {
  const shopId = raw?.trim() ?? "";
  if (!isShopUuid(shopId)) {
    throw new Error("Shop id is not configured.");
  }
  return shopId;
}

/** Cache / tag key segment for one shop's catalog. */
export function catalogCacheTag(shopId: string): string {
  return `storefront-catalog-${shopId}`;
}
