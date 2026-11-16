/**
 * Carousel slot width for home rails, cart “You may also like”, and
 * other horizontal product strips. ~152px so more cards peek in the rail.
 */
export const PRODUCT_CAROUSEL_SLOT = "w-[9.5rem]";

/** @deprecated Prefer PRODUCT_CAROUSEL_SLOT — cart rail matches home now. */
export const CART_SUGGESTION_SLOT = PRODUCT_CAROUSEL_SLOT;

/** @deprecated Prefer gap-3 with PRODUCT_CAROUSEL_SLOT. */
export const CART_SUGGESTION_GAP = "gap-3";
