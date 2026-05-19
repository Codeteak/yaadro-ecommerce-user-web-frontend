/**
 * Storefront cart promotion helpers (SKU campaigns, bundle BOGO reward lines).
 */

import { formatBundleRuleLabel, getPrimaryBundleRule } from './productUtils';

export function stripPaidCartLinesOnly(items) {
  return (Array.isArray(items) ? items : []).filter((it) => !isBundleRewardCartLine(it));
}

export function getCartLineBundleRule(item) {
  if (!item || isBundleRewardCartLine(item)) return null;
  return (
    getPrimaryBundleRule(item?.product) ||
    getPrimaryBundleRule({
      bundleRules: item?.bundleRules,
      bundle_rules: item?.bundle_rules,
    })
  );
}

export function getCartLineBundleLabel(item) {
  const rule = getCartLineBundleRule(item);
  return rule ? formatBundleRuleLabel(rule) : null;
}

export function bundleRewardMatchesParent(rewardLine, parentId) {
  const pid = String(parentId || '');
  if (!pid || !isBundleRewardCartLine(rewardLine)) return false;
  const rid = String(rewardLine.cartItemId ?? rewardLine.id ?? '');
  if (rid === `${pid}:bundle-reward`) return true;
  return (
    String(
      rewardLine.bundleSourceCartItemId ??
        rewardLine.bundle_source_item_id ??
        rewardLine.bundle_source_cart_item_id ??
        ''
    ) === pid
  );
}

export function isBundleRewardCartLine(apiItem) {
  if (!apiItem) return false;
  const id = String(apiItem.id ?? apiItem.cartItemId ?? '');
  return (
    apiItem.is_bundle_reward === true ||
    apiItem.isBundleReward === true ||
    id.endsWith(':bundle-reward')
  );
}

export function isBundleRewardCartLineId(itemId) {
  return String(itemId || '').endsWith(':bundle-reward');
}

function readQuantityFields(item) {
  const q = item?.quantity;
  if (q && typeof q === 'object' && !Array.isArray(q)) {
    return {
      paid: Number(q.paid ?? q.paid_quantity) || 0,
      free: Number(q.free ?? q.free_quantity) || 0,
      display: Number(q.display ?? q.display_quantity) || 0,
      billable: Number(q.billable ?? q.billable_quantity) || 0,
    };
  }
  const paid = Number(item?.paid_quantity ?? item?.paidQuantity) || Number(item?.quantity) || 0;
  const hasOffer = item?.offer_quantity != null || item?.offerQuantity != null;
  const offerQty = Number(item?.offer_quantity ?? item?.offerQuantity);
  const freeFromOffer =
    hasOffer && Number.isFinite(offerQty) && offerQty >= 0 ? Math.floor(offerQty) : null;
  const free =
    freeFromOffer != null
      ? freeFromOffer
      : Number(item?.free_quantity ?? item?.freeQuantity) || 0;
  const display =
    Number(item?.display_quantity ?? item?.displayQuantity) || paid + free || paid;
  return {
    paid,
    free,
    display: display > 0 ? display : paid,
    billable: Number(item?.billable_quantity ?? item?.billableQuantity) || paid,
    hasExplicitOffer: hasOffer,
  };
}

/** Free units on a line from API `offer_quantity` / `free_quantity` / display − paid (no rule inference). */
export function readLineFreeQuantity(line) {
  if (!line) return 0;
  if (line.offer_quantity != null || line.offerQuantity != null) {
    return Math.max(0, Number(line.offer_quantity ?? line.offerQuantity) || 0);
  }
  const fq = Number(line.freeQuantity ?? line.free_quantity);
  if (Number.isFinite(fq) && fq >= 0) return fq;
  const dq = Number(line.displayQuantity ?? line.display_quantity);
  const pq = getCartLinePaidQty(line);
  if (Number.isFinite(dq) && dq > pq) return dq - pq;
  return 0;
}

/** Infer free units from product `bundle_rules` when the cart API omits `free_quantity`. */
function inferBundleFreeFromProductRules(item) {
  const product = item?.product;
  const rules =
    product?.bundleRules ??
    product?.bundle_rules ??
    item?.bundleRules ??
    item?.bundle_rules;
  if (!Array.isArray(rules) || !rules.length) return 0;
  const rule = rules[0];
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(get) || get <= 0 || reward !== 'free') {
    return 0;
  }
  const paid = getCartLinePaidQty(item);
  if (paid < buy) return 0;
  return Math.floor(paid / buy) * get;
}

/** Billable/paid quantity on a line (stepper +/- targets this, not free bundle units). */
export function getCartLinePaidQty(item) {
  if (!item) return 0;
  if (isBundleRewardCartLine(item)) return Math.max(1, Number(item.quantity) || 1);
  const nested = readQuantityFields(item);
  if (nested.paid > 0) return nested.paid;
  const q = Number(item.quantity);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

/** Total units shown to the customer (paid + bundle free on the same SKU). */
export function getCartLineDisplayQty(item) {
  if (!item) return 0;
  if (isBundleRewardCartLine(item)) return Math.max(1, Number(item.quantity) || 1);
  const paid = getCartLinePaidQty(item);
  const display = Number(item.displayQuantity ?? item.display_quantity);
  if (Number.isFinite(display) && display >= paid) return display;
  const nested = readQuantityFields(item);
  if (nested.display >= paid) return nested.display;
  const freeExtra = getBundleFreeExtraOnPaidLine(item);
  return paid + freeExtra;
}

/** Sum display units without double-counting embedded free qty and separate `:bundle-reward` rows. */
export function sumCartDisplayUnits(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  const paidLines = items.filter((it) => !isBundleRewardCartLine(it));
  const rewardLines = items.filter((it) => isBundleRewardCartLine(it));
  let total = 0;
  let embeddedFree = 0;
  for (const line of paidLines) {
    total += getCartLineDisplayQty(line);
    embeddedFree += getBundleFreeExtraOnPaidLine(line);
  }
  if (!rewardLines.length) return total;
  if (embeddedFree > 0) return total;
  return (
    total + rewardLines.reduce((sum, line) => sum + (Number(line.quantity) || 1), 0)
  );
}

/** Free units on a paid line (from API `offer_quantity` / `free_quantity` or bundle rules). */
export function getBundleFreeExtraOnPaidLine(item) {
  if (!item || isBundleRewardCartLine(item)) return 0;
  const nested = readQuantityFields(item);
  if (nested.hasExplicitOffer) return Math.max(0, nested.free);
  if (item.offer_quantity != null || item.offerQuantity != null) {
    return readLineFreeQuantity(item);
  }
  if (nested.free > 0) return nested.free;
  const free = Number(item.freeQuantity ?? item.free_quantity);
  if (Number.isFinite(free) && free > 0) return free;
  const display = nested.display || Number(item.displayQuantity ?? item.display_quantity);
  const paid = nested.paid || getCartLinePaidQty(item);
  if (Number.isFinite(display) && display > paid) return display - paid;
  return inferBundleFreeFromProductRules(item);
}

/** UI-only free line when API encodes bundle on the paid row but omits `:bundle-reward`. */
export function buildSyntheticBundleRewardLine(paidLine, freeQty, parentId) {
  const label = paidLine.unitLabel ?? paidLine.unit ?? '';
  const qty = Math.max(1, Math.floor(Number(freeQty) || 1));
  const rewardId = `${parentId}:bundle-reward`;

  return {
    ...paidLine,
    id: rewardId,
    cartItemId: rewardId,
    cartItemKey: rewardId,
    paidCartItemId: parentId,
    isBundleReward: true,
    bundleSourceCartItemId: parentId,
    quantity: qty,
    displayQuantity: qty,
    freeQuantity: qty,
    price: 0,
    originalPrice: null,
    lineTotal: 0,
    total: 0,
    promoDiscountMinor: 0,
    totalDiscountMinor: 0,
    sizeDisplay: label ? `${qty} ${label} · Free` : 'Free item',
  };
}

function hasBundleRewardForParent(items, parentId) {
  const pid = String(parentId || '');
  if (!pid) return false;
  return items.some((it) => bundleRewardMatchesParent(it, pid));
}

/** Apply buy-X-get-Y free/display quantities on guest (localStorage) cart lines. */
export function applyGuestCartLineBundleQuantities(item) {
  if (!item || isBundleRewardCartLine(item)) return item;
  const paid = Math.max(1, Number(item.quantity) || 0);
  const line = { ...item, quantity: paid };
  const free = getBundleFreeExtraOnPaidLine(line);
  return {
    ...line,
    quantity: paid,
    paid_quantity: paid,
    offer_quantity: free,
    offerQuantity: free,
    free_quantity: free,
    freeQuantity: free,
    displayQuantity: paid + free,
    display_quantity: paid + free,
  };
}

export function applyGuestCartBundleQuantities(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => !isBundleRewardCartLine(it))
    .map(applyGuestCartLineBundleQuantities);
}

/**
 * Ensures buy-X-get-Y free units appear as their own cart row in the UI.
 * Recomputes free-line qty when paid qty changes (API or guest cart).
 */
export function expandCartItemsWithBundleRewards(items) {
  if (!Array.isArray(items) || !items.length) return [];

  const paidLines = stripPaidCartLinesOnly(items);
  const rewardLines = items.filter((it) => isBundleRewardCartLine(it));
  const out = [...paidLines];

  for (const paid of paidLines) {
    const parentId = String(paid.cartItemId ?? paid.id ?? paid.productId ?? '');
    if (!parentId) continue;

    const freeQty = getBundleFreeExtraOnPaidLine(paid);
    if (freeQty <= 0) continue;

    const apiReward = rewardLines.find((r) => bundleRewardMatchesParent(r, parentId));
    if (apiReward) {
      out.push({
        ...apiReward,
        quantity: Math.max(1, Number(apiReward.quantity) || freeQty),
        displayQuantity: Math.max(1, Number(apiReward.displayQuantity) || freeQty),
        freeQuantity: Math.max(1, Number(apiReward.freeQuantity) || freeQty),
      });
    } else {
      out.push(buildSyntheticBundleRewardLine(paid, freeQty, parentId));
    }
  }

  return out;
}

export function getPaidCartItemId(apiItem) {
  if (!apiItem) return null;
  const id = String(apiItem.id ?? apiItem.cartItemId ?? '');
  if (isBundleRewardCartLine(apiItem)) {
    return (
      apiItem.bundle_source_item_id ??
      apiItem.bundle_source_cart_item_id ??
      apiItem.bundleSourceItemId ??
      apiItem.bundleSourceCartItemId ??
      id.replace(/:bundle-reward$/, '')
    );
  }
  return id || null;
}

/**
 * Normalize `promotions` from GET /storefront/cart (v0.2+).
 */
export function normalizeCartPromotions(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      paused: false,
      auto: null,
      coupon: {
        code: null,
        status: 'none',
        discountMinor: 0,
        reasonCode: null,
        reasonMessage: null,
      },
      suggestedCoupons: [],
    };
  }

  const couponRaw = raw.coupon && typeof raw.coupon === 'object' ? raw.coupon : {};
  const autoRaw = raw.auto && typeof raw.auto === 'object' ? raw.auto : null;
  const typesRaw = raw.types ?? autoRaw?.types;
  const types = Array.isArray(typesRaw) ? typesRaw.map(String) : [];
  const topPromotionIds = raw.promotion_ids ?? raw.promotionIds;

  const suggestedRaw = raw.suggested_coupons ?? raw.suggestedCoupons;
  const suggestedCoupons = Array.isArray(suggestedRaw)
    ? suggestedRaw
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          return {
            code: String(row.code || '').toUpperCase(),
            applicable: row.applicable !== false,
            reasonCodes: Array.isArray(row.reason_codes)
              ? row.reason_codes
              : Array.isArray(row.reasonCodes)
                ? row.reasonCodes
                : [],
          };
        })
        .filter(Boolean)
    : [];

  const appliedPromotionIds = Array.isArray(topPromotionIds)
    ? topPromotionIds
    : autoRaw?.applied_promotion_ids ?? autoRaw?.appliedPromotionIds ?? [];

  const auto =
    autoRaw || types.length || appliedPromotionIds.length
      ? {
          appliedPromotionIds,
          bundleDiscountMinor: Number(autoRaw?.bundle_discount_minor ?? autoRaw?.bundleDiscountMinor ?? 0) || 0,
          linePromoDiscountMinor:
            Number(autoRaw?.line_promo_discount_minor ?? autoRaw?.linePromoDiscountMinor ?? 0) || 0,
          hasSkuPromo:
            types.includes('sku') || !!(autoRaw?.has_sku_promo ?? autoRaw?.hasSkuPromo),
          hasBundle:
            types.includes('bundle') || !!(autoRaw?.has_bundle ?? autoRaw?.hasBundle),
        }
      : null;

  return {
    paused: !!raw.paused,
    types,
    promotionIds: appliedPromotionIds,
    hasOffer: types.includes('offer'),
    hasSku: types.includes('sku'),
    hasBundle: types.includes('bundle'),
    hasCoupon: types.includes('coupon'),
    auto,
    coupon: {
      code: couponRaw.code ? String(couponRaw.code).toUpperCase() : null,
      status: couponRaw.status || 'none',
      discountMinor: Number(couponRaw.discount_minor ?? couponRaw.discountMinor ?? 0) || 0,
      reasonCode: couponRaw.reason_code ?? couponRaw.reasonCode ?? null,
      reasonMessage: couponRaw.reason_message ?? couponRaw.reasonMessage ?? null,
    },
    suggestedCoupons,
  };
}

const COUPON_REASON_MESSAGES = {
  COUPON_NO_CART_BENEFIT: 'This coupon has no cart discount rules.',
  COUPON_NOT_FOUND: 'This coupon code was not found.',
  COUPON_NOT_APPLICABLE: 'This coupon cannot be used on this order.',
  COUPON_EXHAUSTED: 'This coupon has reached its usage limit.',
  MIN_SUBTOTAL_NOT_MET: 'Cart subtotal is below the minimum for this coupon.',
  FIRST_ORDER_ONLY_NOT_MET: 'Valid on first order only.',
  NEW_CUSTOMER_ONLY_NOT_MET: 'Valid for new customers only.',
  EMPTY_CART_WITH_COUPON: 'Add items to your cart before applying a coupon.',
};

/** User-facing copy for `promotions.coupon` preview from GET /storefront/cart?couponCode= */
export function formatCartCouponPreviewMessage(coupon) {
  if (!coupon || typeof coupon !== 'object') return null;
  const msg = String(coupon.reasonMessage ?? coupon.reason_message ?? '').trim();
  if (msg) return msg;
  const code = coupon.reasonCode ?? coupon.reason_code;
  if (code && COUPON_REASON_MESSAGES[code]) return COUPON_REASON_MESSAGES[code];
  if (coupon.status === 'not_applicable') return 'This coupon cannot be applied to your cart.';
  return null;
}

export function formatCouponIneligibilityHint(codes) {
  const list = Array.isArray(codes) ? codes : codes ? [codes] : [];
  if (!list.length) return null;
  for (const code of list) {
    if (code && COUPON_REASON_MESSAGES[code]) return COUPON_REASON_MESSAGES[code];
  }
  if (list.includes('MIN_SUBTOTAL_NOT_MET')) return COUPON_REASON_MESSAGES.MIN_SUBTOTAL_NOT_MET;
  if (list.includes('FIRST_ORDER_ONLY_NOT_MET')) return COUPON_REASON_MESSAGES.FIRST_ORDER_ONLY_NOT_MET;
  if (list.includes('NEW_CUSTOMER_ONLY_NOT_MET')) return COUPON_REASON_MESSAGES.NEW_CUSTOMER_ONLY_NOT_MET;
  return 'Not applicable to this order';
}

/** True when GET cart preview applied the selected coupon (1000 minor = ₹10). */
export function isCartCouponPreviewApplied(coupon, selectedCode) {
  if (!coupon || !selectedCode) return false;
  if (coupon.status !== 'applied') return false;
  return (
    String(coupon.code || '').toUpperCase() === String(selectedCode).trim().toUpperCase()
  );
}
