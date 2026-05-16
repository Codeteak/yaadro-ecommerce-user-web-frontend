/**
 * List/MRP total, payable total, and savings — same rules as `SummaryCard` on cart/checkout.
 * @returns {{ mrpTotal: number, payable: number, savings: number, hasOffer: boolean }}
 */
export function getCartBottomBarPricing(cartItems, cartTotal) {
  if (!cartItems?.length) {
    return { mrpTotal: 0, payable: 0, savings: 0, hasOffer: false };
  }
  const mrpTotal = cartItems.reduce((acc, item) => {
    if (item.isBundleReward) return acc;
    const mrp = item.originalPrice || (item.selectedSize?.price ?? parseFloat(item.price));
    const qty = Number(item.quantity) || 1;
    const line = (Number.isFinite(Number(mrp)) ? Number(mrp) : 0) * qty;
    return acc + line;
  }, 0);
  const payable =
    cartTotal != null && Number.isFinite(Number(cartTotal))
      ? Number(cartTotal)
      : cartItems.reduce((t, i) => {
          if (i.isBundleReward) return t;
          const line = Number(i.lineTotal);
          if (Number.isFinite(line) && line >= 0) return t + line;
          return t + Number(i.price ?? 0) * (Number(i.quantity) || 1);
        }, 0);
  const savings = Math.max(0, mrpTotal - payable);
  const hasOffer = savings > 0.009;
  return { mrpTotal, payable, savings, hasOffer };
}

/**
 * Cart-wide rupee savings vs list/MRP — mirrors `SummaryCard` on `app/cart/page.js`.
 */
export function computeCartSavings(cartItems, cartTotal) {
  const { savings } = getCartBottomBarPricing(cartItems, cartTotal);
  return savings > 0.009 ? savings : 0;
}
