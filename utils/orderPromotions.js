/**
 * Order-level and line-level promotion display helpers (storefront orders API).
 */

export function parseOrderQuantity(raw) {
  const n = parseFloat(String(raw ?? '1'));
  if (!Number.isFinite(n)) return 1;
  if (n === 0) return 0;
  return n > 0 ? n : 1;
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

/**
 * Line fulfilled by shop: removed line, or qty changed from what customer ordered.
 * Backend may send `originalQuantity`, `isDeleted`, `quantityAdjusted`, etc.
 */
export function getShopLineFulfillmentMeta(item) {
  if (!item || typeof item !== 'object') {
    return {
      isDeleted: false,
      currentQty: 1,
      originalQty: null,
      showRemoved: false,
      showShopQtyUpdate: false,
    };
  }

  const isDeleted =
    item.isDeleted === true ||
    item.is_deleted === true ||
    item.deleted === true ||
    item.removed === true;

  const currentQty = parseOrderQuantity(item.quantity);

  const rawOriginal =
    item.originalQuantity ??
    item.original_quantity ??
    item.orderedQuantity ??
    item.ordered_quantity ??
    item.placedQuantity ??
    item.placed_quantity ??
    item.requestedQuantity ??
    item.requested_quantity ??
    item.customerQuantity ??
    item.customer_quantity ??
    null;
  let originalQty = null;
  if (rawOriginal != null && rawOriginal !== '') {
    const n = parseFloat(String(rawOriginal));
    if (Number.isFinite(n) && n > 0) originalQty = n;
  }

  const explicitAdjust =
    item.quantityAdjusted === true ||
    item.quantity_adjusted === true ||
    item.shopQuantityAdjusted === true ||
    item.shopQuantityUpdated === true ||
    item.shop_quantity_updated === true ||
    item.shopUpdated === true ||
    item.shop_updated === true;

  const qtyDiffers =
    originalQty != null && Math.abs(originalQty - currentQty) > 1e-6;

  const showShopQtyUpdate =
    !isDeleted && (explicitAdjust || qtyDiffers);

  return {
    isDeleted,
    currentQty,
    originalQty,
    showRemoved: isDeleted,
    showShopQtyUpdate,
  };
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
