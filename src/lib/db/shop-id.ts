const SHOP_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isShopUuid(value: string): boolean {
  return SHOP_UUID.test(value);
}

/** Shop id from the server env. Rejects anything that is not a UUID. */
export function requireShopId(raw = process.env.NEXT_PUBLIC_SHOP_ID): string {
  const shopId = raw?.trim() ?? "";
  if (!isShopUuid(shopId)) {
    throw new Error("Shop id is not configured.");
  }
  return shopId;
}
