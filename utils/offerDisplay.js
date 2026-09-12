/**
 * Normalized offer types / badges / cart grouping for storefront promo UX.
 * Same-SKU BOGO only (paid line + free reward row); no cross-SKU gift model.
 */

import {
  formatBundleRibbonLabel,
  formatBundleRuleLabel,
  getPrimaryBundleRule,
  hasActiveOffer,
} from './productUtils';
import {
  getBundleFreeExtraOnPaidLine,
  getCartLineBundleLabel,
  getCartLineBundleRule,
  getCartLinePaidQty,
  getPaidCartItemId,
  isBundleRewardCartLine,
} from './cartPromotions';

export const OFFER_TYPES = Object.freeze({
  CATALOG_OFFER: 'catalog_offer',
  SKU_PRICE: 'sku_price',
  BUY_X_GET_Y: 'buy_x_get_y',
  COUPON: 'coupon',
  NONE: 'none',
});

function parseMoney(value) {
  const n = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** Compact BOGO badge: B1G1 / BOGO / B2G1 */
export function formatBogoBadge(rule) {
  if (!rule || typeof rule !== 'object') return 'BOGO';
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  if (Number.isFinite(buy) && buy > 0 && Number.isFinite(get) && get > 0) {
    if (buy === 1 && get === 1) return 'BOGO';
    return `B${buy}G${get}`;
  }
  return 'BOGO';
}

/** Catalog / PLP / PDP offer chips from a product. */
export function getProductOfferDisplay(product) {
  if (!product) {
    return {
      offerType: OFFER_TYPES.NONE,
      badges: [],
      secondaryText: null,
      bundleLabel: null,
      saveRupees: null,
    };
  }
  const rule = getPrimaryBundleRule(product);
  const bundleLabel = rule
    ? formatBundleRuleLabel(rule)
    : String(product.bundleLabel || '').trim() || null;
  const badges = [];
  let offerType = OFFER_TYPES.NONE;

  if (rule) {
    offerType = OFFER_TYPES.BUY_X_GET_Y;
    badges.push(formatBogoBadge(rule));
  }

  const list = parseMoney(product.originalPrice ?? product.actualPrice ?? product.listPrice);
  const pay = parseMoney(product.price);
  let saveRupees = null;
  if (list > pay + 0.004) {
    saveRupees = Math.round((list - pay) * 100) / 100;
    badges.push(`SAVE ₹${Math.round(saveRupees)}`);
    if (offerType === OFFER_TYPES.NONE) offerType = OFFER_TYPES.CATALOG_OFFER;
  } else if (hasActiveOffer(product) && offerType === OFFER_TYPES.NONE) {
    offerType = OFFER_TYPES.CATALOG_OFFER;
  }

  const promoTypes = product?.promo?.types ?? product?.promoTypes;
  if (Array.isArray(promoTypes) && promoTypes.includes('sku') && offerType === OFFER_TYPES.NONE) {
    offerType = OFFER_TYPES.SKU_PRICE;
  }

  let secondaryText = null;
  if (bundleLabel) secondaryText = bundleLabel;
  else if (saveRupees != null && saveRupees > 0) secondaryText = 'On offer';

  return {
    offerType,
    badges,
    secondaryText,
    bundleLabel,
    bundleRibbon: rule ? formatBundleRibbonLabel(rule, { compact: true }) : null,
    saveRupees,
    buyQty: rule ? Number(rule.buy_qty ?? rule.buyQty) || null : null,
    getQty: rule ? Number(rule.get_qty ?? rule.getQty) || null : null,
  };
}

function lineUnitPrice(item) {
  if (isBundleRewardCartLine(item)) return 0;
  const fromSize = item?.selectedSize?.price;
  if (fromSize != null && Number.isFinite(Number(fromSize))) return Number(fromSize);
  return parseMoney(item?.price);
}

function lineListUnit(item) {
  if (item?.originalPrice != null && Number.isFinite(Number(item.originalPrice))) {
    return Number(item.originalPrice);
  }
  return null;
}

function linePayTotal(item) {
  if (isBundleRewardCartLine(item)) return 0;
  if (Number.isFinite(Number(item.lineTotal)) && item.lineTotal >= 0) return Number(item.lineTotal);
  return lineUnitPrice(item) * (Number(item.quantity) || 1);
}

/**
 * Group expanded cart lines into parent + free children for OfferGroupCard.
 * @param {unknown[]} items already expanded cart rows
 */
export function buildCartOfferGroups(items) {
  const list = Array.isArray(items) ? items : [];
  const rewardsByParent = new Map();

  for (const it of list) {
    if (!isBundleRewardCartLine(it)) continue;
    const pid = String(getPaidCartItemId(it) || '');
    if (!pid) continue;
    const arr = rewardsByParent.get(pid) || [];
    arr.push(it);
    rewardsByParent.set(pid, arr);
  }

  const groups = [];
  for (const it of list) {
    if (isBundleRewardCartLine(it)) continue;
    const parentId = String(it.cartItemId ?? it.id ?? it.cartItemKey ?? '');
    const children = rewardsByParent.get(parentId) || [];
    const freeExtra = getBundleFreeExtraOnPaidLine(it);
    const rule = getCartLineBundleRule(it);
    const badges = [];
    let offerType = OFFER_TYPES.NONE;

    if (children.length > 0 || freeExtra > 0) {
      offerType = OFFER_TYPES.BUY_X_GET_Y;
      badges.push(formatBogoBadge(rule));
      badges.push('FREE');
    }

    const unit = lineUnitPrice(it);
    const listUnit = lineListUnit(it);
    const paidQty = getCartLinePaidQty(it);
    let savingsMajor = 0;
    if (listUnit != null && listUnit > unit + 0.004) {
      savingsMajor += (listUnit - unit) * paidQty;
      badges.push(`SAVE ₹${Math.round((listUnit - unit) * paidQty)}`);
      if (offerType === OFFER_TYPES.NONE) offerType = OFFER_TYPES.CATALOG_OFFER;
    }
    if (freeExtra > 0) {
      savingsMajor += unit * freeExtra;
    }

    const promoTypes = it?.promo?.types ?? it?.promoTypes;
    if (
      Array.isArray(promoTypes) &&
      promoTypes.includes('sku') &&
      offerType === OFFER_TYPES.NONE
    ) {
      offerType = OFFER_TYPES.SKU_PRICE;
    }

    groups.push({
      parentLineItemId: parentId,
      offerType,
      parent: it,
      children,
      badges: [...new Set(badges)],
      savingsMinor: Math.round(savingsMajor * 100),
      bundleLabel: getCartLineBundleLabel(it),
      paidQuantity: paidQty,
      freeQuantity: freeExtra || children.reduce((s, c) => s + (Number(c.quantity) || 0), 0),
    });
  }

  return groups;
}

/**
 * Coupon threshold hint from cart promotions + optional coupon catalog rows.
 * @returns {{ message: string, code: string | null, remainingMinor: number } | null}
 */
export function getCouponThresholdHint(promotions, cartSubtotalMinor, couponCatalog = []) {
  const sub = Math.max(0, Number(cartSubtotalMinor) || 0);
  const catalog = Array.isArray(couponCatalog) ? couponCatalog : [];
  const suggested = promotions?.suggestedCoupons || [];

  let best = null;
  for (const row of catalog) {
    const min = Number(row.minSubtotalMinor ?? row.min_subtotal_minor);
    if (!Number.isFinite(min) || min <= 0) continue;
    if (sub >= min) continue;
    const remaining = min - sub;
    const code = String(row.code || '').toUpperCase() || null;
    if (!best || remaining < best.remainingMinor) {
      best = {
        code,
        remainingMinor: remaining,
        message: code
          ? `₹${(remaining / 100).toLocaleString('en-IN')} more to unlock ${code}`
          : `₹${(remaining / 100).toLocaleString('en-IN')} more to unlock a coupon`,
      };
    }
  }

  if (best) return best;

  const coupon = promotions?.coupon;
  if (
    coupon &&
    (coupon.reasonCode === 'MIN_SUBTOTAL_NOT_MET' ||
      coupon.reason_code === 'MIN_SUBTOTAL_NOT_MET') &&
    coupon.code
  ) {
    return {
      code: String(coupon.code).toUpperCase(),
      remainingMinor: 0,
      message:
        coupon.reasonMessage ||
        coupon.reason_message ||
        `Add more items to unlock ${String(coupon.code).toUpperCase()}`,
    };
  }

  if (suggested.length > 0) {
    const row = suggested.find((s) => s.applicable === false) || suggested[0];
    if (row?.code && Array.isArray(row.reasonCodes) && row.reasonCodes.includes('MIN_SUBTOTAL_NOT_MET')) {
      return {
        code: String(row.code).toUpperCase(),
        remainingMinor: 0,
        message: `Add more items to unlock ${String(row.code).toUpperCase()}`,
      };
    }
  }

  return null;
}

/** Compare free-unit totals across cart snapshots (for add-to-cart toast). */
export function sumCartFreeUnits(items) {
  const list = Array.isArray(items) ? items : [];
  let free = 0;
  for (const it of list) {
    if (isBundleRewardCartLine(it)) {
      free += Math.max(0, Number(it.quantity) || 0);
      continue;
    }
    free += getBundleFreeExtraOnPaidLine(it);
  }
  // Avoid double-count when both embedded free and reward rows exist
  const hasRewards = list.some(isBundleRewardCartLine);
  const embedded = list
    .filter((it) => !isBundleRewardCartLine(it))
    .reduce((s, it) => s + getBundleFreeExtraOnPaidLine(it), 0);
  if (hasRewards && embedded > 0) {
    return list
      .filter(isBundleRewardCartLine)
      .reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  }
  return free;
}

export function findProductNameForNewFreeUnits(prevItems, nextItems) {
  const prevMap = new Map();
  for (const it of prevItems || []) {
    if (isBundleRewardCartLine(it)) continue;
    const id = String(it.cartItemId ?? it.id ?? '');
    prevMap.set(id, getBundleFreeExtraOnPaidLine(it));
  }
  for (const it of nextItems || []) {
    if (isBundleRewardCartLine(it)) continue;
    const id = String(it.cartItemId ?? it.id ?? '');
    const nextFree = getBundleFreeExtraOnPaidLine(it);
    const prevFree = prevMap.get(id) || 0;
    if (nextFree > prevFree) {
      return String(it.name || it.productName || 'item');
    }
  }
  return null;
}

export { lineUnitPrice, lineListUnit, linePayTotal };
