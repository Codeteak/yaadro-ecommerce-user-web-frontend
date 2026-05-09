/**
 * Cart-wide rupee savings vs list/MRP — mirrors `SummaryCard` / `SavingsBanner` on `app/cart/page.js`.
 */
export function computeCartSavings(cartItems, cartTotal) {
  if (!cartItems?.length) return 0;
  const mrpTotal = cartItems.reduce((acc, item) => {
    const mrp = item.originalPrice || (item.selectedSize?.price ?? parseFloat(item.price));
    const qty = Number(item.quantity) || 1;
    const line = (Number.isFinite(mrp) ? mrp : 0) * qty;
    return acc + line;
  }, 0);
  const pay =
    cartTotal != null && Number.isFinite(Number(cartTotal))
      ? Number(cartTotal)
      : cartItems.reduce((t, i) => t + Number(i.price ?? 0) * (Number(i.quantity) || 1), 0);
  const raw = mrpTotal - pay;
  return raw > 0.009 ? raw : 0;
}
