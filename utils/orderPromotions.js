/**
 * Order-level and line-level promotion display helpers (storefront orders API).
 */

export function parseOrderQuantity(raw) {
  const n = parseFloat(String(raw ?? '1'));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseMinorInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

export function minorToMajor(minor) {
  const n = Number(minor ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

export function formatInrFromMinor(minor) {
  const major = minorToMajor(minor);
  return formatInrMajor(major);
}

export function formatInrMajor(major) {
  const n = Number(major);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Infer paid units from line totals when API sends bundle display qty on one row. */
export function inferOrderLinePaidQuantity(item) {
  const qty = parseOrderQuantity(item?.quantity);
  let unitMinor = parseMinorInt(
    item?.unit_price_minor_snapshot ?? item?.unitPriceMinorSnapshot ?? item?.unitPriceMinor
  );
  let lineMinor = parseMinorInt(item?.line_total_minor ?? item?.lineTotalMinor);
  if (unitMinor <= 0 && item?.unitPrice != null) {
    unitMinor = Math.round(Number(item.unitPrice) * 100);
  }
  if (lineMinor <= 0 && item?.totalPrice != null) {
    lineMinor = Math.round(Number(item.totalPrice) * 100);
  }
  if (unitMinor > 0 && lineMinor > 0) {
    const paid = Math.round(lineMinor / unitMinor);
    if (paid >= 1 && paid <= qty) return paid;
  }
  return qty;
}

export function getOrderLineOfferLabel(item) {
  const ids = item?.appliedPromotionIds ?? item?.applied_promotion_ids ?? [];
  const hasIds = Array.isArray(ids) && ids.length > 0;
  const lineDisc = parseMinorInt(item?.line_discount_minor ?? item?.lineDiscountMinor);
  const paid = inferOrderLinePaidQuantity(item);
  const displayQty = parseOrderQuantity(item?.quantity);

  if (hasIds && paid > 0 && displayQty > paid) {
    return 'Bundle offer';
  }
  if (hasIds || lineDisc > 0) {
    return 'Offer applied';
  }
  return null;
}

export function getOrderPromotionSummary(order) {
  if (!order) {
    return {
      couponCode: null,
      promotionDiscountMinor: 0,
      promotionDiscountMajor: 0,
      appliedPromotionIds: [],
      hasPromotions: false,
    };
  }

  const couponCode =
    order.couponCode ??
    order.coupon_code_normalized ??
    order.coupon_code ??
    null;

  const promotionDiscountMinor = parseMinorInt(
    order.promotionDiscountMinor ??
      order.promotion_discount_total_minor ??
      order.promotionDiscountTotalMinor
  );

  const appliedPromotionIds = Array.isArray(order.appliedPromotionIds)
    ? order.appliedPromotionIds
    : Array.isArray(order.applied_promotion_ids)
      ? order.applied_promotion_ids
      : [];

  const hasPromotions =
    promotionDiscountMinor > 0 ||
    Boolean(String(couponCode || '').trim()) ||
    appliedPromotionIds.length > 0;

  return {
    couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
    promotionDiscountMinor,
    promotionDiscountMajor: minorToMajor(promotionDiscountMinor),
    appliedPromotionIds,
    hasPromotions,
  };
}
