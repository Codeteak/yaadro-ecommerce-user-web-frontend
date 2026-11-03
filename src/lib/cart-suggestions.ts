import {
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";

/**
 * Sample “you may also like” for cart — prefers categories already in the
 * basket, skips ids already carted. Stable order (no shuffle).
 */
export function cartSuggestions(
  cartProductIds: readonly string[],
  limit = 6,
): SampleProduct[] {
  const inCart = new Set(cartProductIds);
  const cartCategories = new Set(
    SAMPLE_PRODUCTS.filter((p) => inCart.has(p.id)).map((p) => p.category),
  );

  const sameCategory = SAMPLE_PRODUCTS.filter(
    (p) => !inCart.has(p.id) && cartCategories.has(p.category),
  );
  const others = SAMPLE_PRODUCTS.filter(
    (p) => !inCart.has(p.id) && !cartCategories.has(p.category),
  );

  return [...sameCategory, ...others].slice(0, limit);
}
