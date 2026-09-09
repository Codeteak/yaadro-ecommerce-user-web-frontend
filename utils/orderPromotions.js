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

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

function falsyAvailabilityFlag(value) {
  if (value === false || value === 0) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'false' || s === '0' || s === 'no';
  }
  return false;
}

function parseOptionalQty(raw) {
  if (raw == null || raw === '') return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

/**
 * Whether a line was marked unavailable / removed by the shop or picker.
 * Accepts raw API items or transformed order items.
 *
 * Hard picker signals (deleted flags, status tokens, qty 0, fulfill qty 0) always
 * win — even when the line still carries promotion / offer metadata.
 */
export function isOrderLineUnavailable(item, opts = {}) {
  if (!item || typeof item !== 'object') return false;

  if (
    truthyFlag(item.isDeleted) ||
    truthyFlag(item.is_deleted) ||
    truthyFlag(item.deleted) ||
    truthyFlag(item.removed) ||
    truthyFlag(item.unavailable) ||
    truthyFlag(item.is_unavailable) ||
    truthyFlag(item.isUnavailable) ||
    truthyFlag(item.out_of_stock) ||
    truthyFlag(item.outOfStock) ||
    truthyFlag(item.not_available) ||
    truthyFlag(item.notAvailable)
  ) {
    return true;
  }

  if (
    falsyAvailabilityFlag(item.available) ||
    falsyAvailabilityFlag(item.is_available) ||
    falsyAvailabilityFlag(item.isAvailable)
  ) {
    return true;
  }

  const statusBlob = [
    item.status,
    item.line_status,
    item.lineStatus,
    item.item_status,
    item.itemStatus,
    item.availability_status,
    item.availabilityStatus,
    item.fulfillment_status,
    item.fulfillmentStatus,
    item.fulfillment_state,
    item.fulfillmentState,
    item.pick_status,
    item.pickStatus,
    item.picker_status,
    item.pickerStatus,
  ]
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .join(' ');

  if (statusBlob) {
    if (
      statusBlob.includes('unavail') ||
      statusBlob.includes('out_of_stock') ||
      statusBlob.includes('oos') ||
      statusBlob.includes('removed') ||
      statusBlob.includes('cancel') ||
      statusBlob.includes('not_available') ||
      statusBlob.includes('rejected')
    ) {
      return true;
    }
  }

  const currentQty =
    opts.quantity != null ? Number(opts.quantity) : parseOrderQuantity(item.quantity);

  let originalQty = opts.originalQuantity;
  if (originalQty == null) {
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
    if (rawOriginal != null && rawOriginal !== '') {
      const n = parseFloat(String(rawOriginal));
      if (Number.isFinite(n) && n > 0) originalQty = n;
    }
  }

  // Picker often zeroes quantity without sending original_quantity.
  if (Number.isFinite(currentQty) && currentQty <= 0) {
    return true;
  }

  // Explicit fulfill/shop qty zeroed while customer still has ordered units.
  // Offer/promo metadata must not suppress this (picker can reject free lines too).
  const fulfillQty = parseOptionalQty(
    item.fulfilled_quantity ?? item.fulfilledQuantity ?? item.shop_quantity ?? item.shopQuantity
  );
  const orderedUnits =
    originalQty != null && originalQty > 0
      ? originalQty
      : Number.isFinite(currentQty) && currentQty > 0
        ? currentQty
        : null;
  if (fulfillQty != null && fulfillQty <= 0 && orderedUnits != null && orderedUnits > 0) {
    return true;
  }

  const pickedQty = parseOptionalQty(item.picked_quantity ?? item.pickedQuantity);
  if (
    pickedQty != null &&
    pickedQty <= 0 &&
    orderedUnits != null &&
    orderedUnits > 0 &&
    (truthyFlag(item.quantityAdjusted) ||
      truthyFlag(item.quantity_adjusted) ||
      truthyFlag(item.shopUpdated) ||
      truthyFlag(item.shop_updated))
  ) {
    return true;
  }

  // Picker zeroed line total but left qty/unit price (do not treat BXGY free lines as unavailable).
  const hasOfferSignal =
    opts.hasOfferSignal === true ||
    (Array.isArray(item.appliedPromotionIds) && item.appliedPromotionIds.length > 0) ||
    (Array.isArray(item.applied_promotion_ids) && item.applied_promotion_ids.length > 0) ||
    parseMinorInt(item.line_discount_minor ?? item.lineDiscountMinor) > 0 ||
    item.hasOffer === true;

  const unitMinor =
    opts.unitPriceMinor != null
      ? Number(opts.unitPriceMinor)
      : parseMinorInt(
          item.unit_price_minor_snapshot ?? item.unitPriceMinorSnapshot ?? item.unitPriceMinor
        );
  const unitMajor =
    opts.unitPrice != null
      ? Number(opts.unitPrice)
      : unitMinor > 0
        ? minorToMajor(unitMinor)
        : parseFloat(item.unitPrice ?? item.unit_price ?? item.price ?? 0) || 0;

  const explicitZeroLine =
    opts.lineTotalExplicitZero === true ||
    (opts.lineTotalMinor != null && Number(opts.lineTotalMinor) === 0);

  if (
    !hasOfferSignal &&
    Number.isFinite(currentQty) &&
    currentQty > 0 &&
    unitMajor > 0 &&
    explicitZeroLine
  ) {
    return true;
  }

  return false;
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

  const isDeleted = isOrderLineUnavailable(item, {
    quantity: currentQty,
    originalQuantity: originalQty,
    unitPrice: item.unitPrice ?? item.price,
    totalPrice: item.totalPrice,
    lineTotalExplicitZero:
      Number(item.totalPrice) === 0 &&
      Number(item.unitPrice ?? item.price ?? 0) > 0 &&
      item.hasOffer !== true,
    hasOfferSignal:
      item.hasOffer === true ||
      (Array.isArray(item.appliedPromotionIds) && item.appliedPromotionIds.length > 0) ||
      Number(item.lineDiscountMinor) > 0,
  });

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
