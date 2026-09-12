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
 * Confirmed free BXGY / bundle reward — not merely applied_promotion_ids.
 * Aligns with cart `isBundleRewardCartLine` + free/offer quantity fields.
 */
export function isConfirmedFreeRewardLine(item) {
  if (!item || typeof item !== 'object') return false;
  if (truthyFlag(item.isConfirmedFreeReward)) return true;
  if (
    truthyFlag(item.is_bundle_reward) ||
    truthyFlag(item.isBundleReward) ||
    truthyFlag(item.is_free_reward) ||
    truthyFlag(item.isFreeReward) ||
    truthyFlag(item.is_reward) ||
    truthyFlag(item.isReward)
  ) {
    return true;
  }
  const id = String(item.id ?? item.cartItemId ?? '');
  if (id.endsWith(':bundle-reward')) return true;

  const statusBlob = [
    item.status,
    item.line_status,
    item.lineStatus,
    item.item_status,
    item.itemStatus,
    item.reward_type,
    item.rewardType,
    item.line_type,
    item.lineType,
  ]
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .join(' ');
  if (
    statusBlob &&
    (statusBlob.includes('free_reward') ||
      statusBlob.includes('bundle_reward') ||
      statusBlob === 'free' ||
      statusBlob === 'reward')
  ) {
    return true;
  }

  const qty = parseOrderQuantity(item.quantity);
  const freeQty = parseOptionalQty(
    item.offer_quantity ??
      item.offerQuantity ??
      item.free_quantity ??
      item.freeQuantity ??
      item.free_qty ??
      item.freeQty
  );
  if (freeQty != null && freeQty > 0 && qty > 0 && freeQty >= qty - 1e-9) {
    return true;
  }

  const paidQty = parseOptionalQty(
    item.paid_quantity ?? item.paidQuantity ?? item.billable_quantity ?? item.billableQuantity
  );
  if (paidQty != null && paidQty <= 0 && qty > 0 && freeQty != null && freeQty > 0) {
    return true;
  }

  return false;
}

/** Infer paid units from line totals when API sends bundle display qty on one row. */
export function inferOrderLinePaidQuantity(item) {
  if (isConfirmedFreeRewardLine(item)) return 0;
  const qty = parseOrderQuantity(item?.quantity);
  const freeQty = parseOptionalQty(
    item?.offer_quantity ?? item?.offerQuantity ?? item?.free_quantity ?? item?.freeQuantity
  );
  if (freeQty != null && freeQty > 0 && freeQty < qty) {
    return Math.max(0, qty - freeQty);
  }
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
  if (!item || item.isDeleted === true) return null;
  const paid = inferOrderLinePaidQuantity(item);
  const displayQty = parseOrderQuantity(item?.quantity);
  const freeReward = isConfirmedFreeRewardLine(item);
  const lineDiscMajor =
    item?.lineDiscount != null
      ? Number(item.lineDiscount)
      : minorToMajor(parseMinorInt(item?.line_discount_minor ?? item?.lineDiscountMinor));
  const total = Number(item?.totalPrice ?? 0);

  if (freeReward || (paid > 0 && displayQty > paid)) {
    return displayQty > paid && paid > 0 ? 'BOGO' : 'FREE';
  }
  // Real partial discount on a still-payable line — not a full wipe disguised as an offer.
  if (lineDiscMajor > 0.009 && total > 0.009) {
    return 'Offer applied';
  }
  return null;
}

/**
 * Whether a line was marked unavailable / removed by the shop or picker.
 * Accepts raw API items or transformed order items.
 *
 * Hard picker signals (deleted flags, status tokens, qty 0, fulfill qty 0) always
 * win — even when the line still carries promotion / offer metadata.
 *
 * Explicit zero line totals are unavailable unless the line is a *confirmed* free
 * reward (promo ids alone do not shield picker-zeroed paid lines).
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

  const confirmedFree =
    opts.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(item);

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

  // Picker / promo wipe often zeroes unit_price + line_total but leaves list_price
  // (UI then shows ₹0 with struck list — must still count as unavailable).
  const listMinor =
    opts.listPriceMinor != null
      ? Number(opts.listPriceMinor)
      : parseMinorInt(item.list_price_minor ?? item.listPriceMinor);
  const listMajor =
    opts.listPrice != null
      ? Number(opts.listPrice)
      : listMinor > 0
        ? minorToMajor(listMinor)
        : parseFloat(item.listPrice ?? item.list_price ?? 0) || 0;
  const catalogMajor = Math.max(unitMajor > 0 ? unitMajor : 0, listMajor > 0 ? listMajor : 0);

  const lineDiscountMinor = parseMinorInt(
    opts.lineDiscountMinor != null
      ? opts.lineDiscountMinor
      : item.line_discount_minor ?? item.lineDiscountMinor ?? item.lineDiscount
  );
  // lineDiscount on transformed items is already major; avoid double-scaling when raw minor missing
  const lineDiscountMajor =
    opts.lineDiscount != null
      ? Number(opts.lineDiscount)
      : item.lineDiscount != null && item.line_discount_minor == null && item.lineDiscountMinor == null
        ? Number(item.lineDiscount) || 0
        : minorToMajor(lineDiscountMinor);

  const explicitZeroLine =
    opts.lineTotalExplicitZero === true ||
    (opts.lineTotalMinor != null && Number(opts.lineTotalMinor) === 0) ||
    (opts.totalPrice != null && Number(opts.totalPrice) === 0);

  // Picker-zeroed / fully wiped lines: catalog price present but payable total wiped.
  // Confirmed free rewards stay available at ₹0; bare promo ids do NOT shield this.
  if (
    !confirmedFree &&
    Number.isFinite(currentQty) &&
    currentQty > 0 &&
    catalogMajor > 0 &&
    explicitZeroLine
  ) {
    return true;
  }

  // Full discount covering catalog×qty with ₹0 payable (common BXGY/picker wipe shape).
  if (
    !confirmedFree &&
    Number.isFinite(currentQty) &&
    currentQty > 0 &&
    catalogMajor > 0 &&
    Number(opts.totalPrice ?? item.totalPrice ?? 0) < 0.009 &&
    lineDiscountMajor > 0 &&
    lineDiscountMajor + 0.02 >= catalogMajor * currentQty
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

  const unitPrice = Number(item.unitPrice ?? item.price ?? 0) || 0;
  const listPrice = Number(item.listPrice ?? item.list_price ?? 0) || 0;
  const totalPrice = Number(item.totalPrice ?? 0);
  const confirmedFree = isConfirmedFreeRewardLine(item);
  const catalogPrice = Math.max(unitPrice, listPrice);

  const isDeleted = isOrderLineUnavailable(item, {
    quantity: currentQty,
    originalQuantity: originalQty,
    unitPrice,
    listPrice,
    totalPrice,
    lineDiscount: Number(item.lineDiscount) || 0,
    lineDiscountMinor: item.lineDiscountMinor,
    lineTotalExplicitZero: totalPrice === 0 && catalogPrice > 0,
    isConfirmedFreeReward: confirmedFree,
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
