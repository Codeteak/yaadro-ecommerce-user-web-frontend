/**
 * Wishlist API façade.
 *
 * Today: read helpers for the local wishlist. Mutations stay in
 * `WishlistContext` (localStorage key `yaadro-wishlist-v1`) until a
 * wishlist API exists — then sync list + toggle through this module.
 * No fake network delays.
 */
import {
  SAMPLE_PRODUCTS,
  type SampleProduct,
} from "@/lib/sample-products";

/** localStorage key used by WishlistContext until server sync. */
export const WISHLIST_STORAGE_KEY = "yaadro-wishlist-v1";

/**
 * Resolve product ids to catalog products (sample catalog for now).
 * Prefer `useWishlist().products` in client UI; this is for non-React callers.
 */
export function listWishlistProducts(ids: string[]): SampleProduct[] {
  const set = new Set(ids);
  return SAMPLE_PRODUCTS.filter((p) => set.has(p.id));
}

/**
 * Placeholder for a future GET wishlist endpoint.
 * Client store still owns ids; call this after fetch to map server ids.
 */
export function listWishlistProductIds(ids: string[]): string[] {
  return ids.filter((id) => SAMPLE_PRODUCTS.some((p) => p.id === id));
}
