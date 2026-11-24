/**
 * Basket-scoped checkout idempotency key.
 * Reusing the same key after the basket or coupon changes can replay an old order.
 */

export type CheckoutIdempotencySlot = {
  basketKey: string;
  key: string;
};

export function createCheckoutIdempotencyKey(
  createKey: () => string = () => crypto.randomUUID(),
): string {
  return createKey();
}

/**
 * Keep the key while the basket+coupon key is unchanged.
 * Mint a new key when the shopper changes lines or the coupon.
 */
export function resolveCheckoutIdempotency(
  current: CheckoutIdempotencySlot | null,
  basketKey: string,
  createKey: () => string = () => crypto.randomUUID(),
): CheckoutIdempotencySlot {
  if (current && current.basketKey === basketKey && current.key) {
    return current;
  }
  return { basketKey, key: createKey() };
}

/** Definitive client errors should not reuse the key (except rate limits). */
export function shouldClearCheckoutIdempotency(
  status: number | null | undefined,
): boolean {
  if (status == null) return false;
  if (status === 429) return false;
  return status >= 400 && status < 500;
}
