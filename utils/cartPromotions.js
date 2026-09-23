/**
 * Storefront cart promotion helpers (SKU campaigns, bundle BOGO reward lines).
 */

import {
  bundleRuleRoleForProduct,
  formatBundleRuleLabel,
  getPrimaryBundleRule,
  isCrossSkuBundleRule,
  lineTotalFromUnitPricing,
} from './productUtils';
import { rewardProductIdFromRule } from './bxgyLabels';
import {
  pickMergedSellUnderList,
  pickSaneListUnit,
} from './catalogOfferPricing';

export function stripPaidCartLinesOnly(items) {
  return (Array.isArray(items) ? items : []).filter((it) => !isBundleRewardCartLine(it));
}

export function cartLineProductId(item) {
  if (!item) return '';
  return String(
    item.productId ?? item.product_id ?? item.product?.id ?? item.id ?? '',
  ).trim();
}

export function getCartLineBundleRule(item) {
  if (!item || isBundleRewardCartLine(item)) return null;
  const pid = cartLineProductId(item);
  const fromProduct = getPrimaryBundleRule({
    id: pid,
    bundleRules: item?.product?.bundleRules ?? item?.product?.bundle_rules,
    bundle_rules: item?.product?.bundle_rules ?? item?.product?.bundleRules,
  });
  if (fromProduct) return fromProduct;
  return getPrimaryBundleRule({
    id: pid,
    bundleRules: item?.bundleRules,
    bundle_rules: item?.bundle_rules,
  });
}

export function getCartLineBundleLabel(item) {
  const rule = getCartLineBundleRule(item);
  if (!rule) return null;
  const pid = cartLineProductId(item);
  const role = bundleRuleRoleForProduct(rule, pid);
  const buyName =
    role === 'buy'
      ? item?.name || item?.productName || ''
      : rule.buy_product_name || rule.buyProductName || '';
  const getName =
    rule.reward_product_name ||
    rule.rewardProductName ||
    rule.get_product_name ||
    (role === 'get' ? item?.name || item?.productName || '' : '');
  return formatBundleRuleLabel(rule, { role, buyName, getName });
}

/** True when a qualified BXGY free unit is actually applied (not merely rule attached). */
export function cartHasQualifiedBxgyOffer(items) {
  const list = Array.isArray(items) ? items : [];
  for (const it of list) {
    if (isBundleRewardCartLine(it)) return true;
    if (getBundleFreeExtraOnPaidLine(it) > 0) return true;
    const rule = getCartLineBundleRule(it);
    if (!rule) continue;
    const pid = cartLineProductId(it);
    const role = bundleRuleRoleForProduct(rule, pid);
    if (role === 'get') continue;
    if (isCrossSkuBundleRule(rule)) {
      const paid = getCartLinePaidQty(it);
      const buy = Number(rule.buy_qty ?? rule.buyQty);
      if (Number.isFinite(buy) && buy > 0 && paid >= buy) return true;
      continue;
    }
    const free = inferSameSkuFreeFromRule(it, rule);
    if (free > 0) return true;
  }
  return false;
}

/**
 * Coupons must not stack when a BXGY deal is actively qualifying.
 */
export function cartHasBxgyOffer(items) {
  return cartHasQualifiedBxgyOffer(items);
}

export const BXGY_COUPON_BLOCKED_MESSAGE =
  'Coupons cannot be used with Buy X Get Y offers.';

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
    id.endsWith(':bundle-reward') ||
    id.startsWith('inject:')
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
function inferSameSkuFreeFromRule(item, rule) {
  if (!rule || isCrossSkuBundleRule(rule)) return 0;
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(get) || get <= 0) return 0;
  if (reward && reward !== 'free') return 0;
  const paid = getCartLinePaidQty(item);
  if (paid < buy) return 0;
  return Math.floor(paid / buy) * get;
}

function inferBundleFreeFromProductRules(item) {
  const rule = getCartLineBundleRule(item);
  if (!rule) return 0;
  const pid = cartLineProductId(item);
  const role = bundleRuleRoleForProduct(rule, pid);
  // Cross reward SKU alone never invents free units of itself.
  if (role === 'get') return 0;
  // Cross buy SKU: free units are a different product — not embedded on this line.
  if (isCrossSkuBundleRule(rule)) return 0;
  return inferSameSkuFreeFromRule(item, rule);
}

/** How many free reward units a buy line unlocks for a cross rule. */
export function getCrossFreeQtyFromBuyLine(item, rule) {
  if (!item || !rule || !isCrossSkuBundleRule(rule)) return 0;
  const pid = cartLineProductId(item);
  if (bundleRuleRoleForProduct(rule, pid) !== 'buy') return 0;
  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(get) || get <= 0) return 0;
  if (reward && reward !== 'free') return 0;
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

/** Sum paid/billable units only (excludes BXGY free reward lines from item counts). */
export function sumCartPaidUnits(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items
    .filter((it) => !isBundleRewardCartLine(it))
    .reduce((sum, line) => sum + getCartLinePaidQty(line), 0);
}

/** Free units on a paid line (from API `offer_quantity` / `free_quantity` or bundle rules). */
export function getBundleFreeExtraOnPaidLine(item) {
  if (!item || isBundleRewardCartLine(item)) return 0;

  // Cross buy SKU never carries free units of itself (even if legacy offer_quantity is set).
  const rule = getCartLineBundleRule(item);
  if (rule && isCrossSkuBundleRule(rule)) {
    const role = bundleRuleRoleForProduct(rule, cartLineProductId(item));
    if (role === 'buy') return 0;
  }

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

/**
 * UI-only free line.
 * Same-SKU: clone paid line.
 * Cross: always use reward SKU — never clone the buy product.
 */
export function buildSyntheticBundleRewardLine(paidLine, freeQty, parentId, options = {}) {
  const qty = Math.max(1, Math.floor(Number(freeQty) || 1));
  const rewardId = `${parentId}:bundle-reward`;
  const rule = options.rule || getCartLineBundleRule(paidLine);
  const cross = rule && isCrossSkuBundleRule(rule);
  const rewardProduct =
    options.rewardProduct ||
    (cross ? rewardSnapshotFromRule(rule, null) : null);

  if (cross) {
    const rewardPid =
      String(rewardProduct?.productId ?? rewardProduct?.id ?? '').trim() ||
      rewardProductIdFromRule(rule);
    if (!rewardPid) {
      // Incomplete rule — skip fake free line rather than cloning buy SKU.
      return null;
    }
    const label = rewardProduct?.unitLabel ?? rewardProduct?.unit ?? '';
    const name =
      rewardProduct?.name || rewardProduct?.productName || 'Free item';
    return {
      ...(rewardProduct && typeof rewardProduct === 'object' ? rewardProduct : {}),
      id: rewardId,
      cartItemId: rewardId,
      cartItemKey: rewardId,
      productId: rewardPid,
      name,
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
      sizeDisplay: label ? `${qty} ${label} · Free` : 'Free',
      bundleRules: undefined,
      bundle_rules: undefined,
    };
  }

  const label = paidLine.unitLabel ?? paidLine.unit ?? '';
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
    sizeDisplay: label ? `${qty} ${label} · Free` : 'Free',
  };
}

function rewardSnapshotFromRule(rule, fallbackLine) {
  if (!rule || !isCrossSkuBundleRule(rule)) return null;
  const rewardId = rewardProductIdFromRule(rule);
  if (!rewardId) return null;
  const name =
    rule.reward_product_name ||
    rule.rewardProductName ||
    rule.get_product_name ||
    rule.getProductName ||
    '';
  const image =
    rule.reward_product_image ||
    rule.rewardProductImage ||
    rule.get_product_image ||
    '';
  if (fallbackLine && cartLineProductId(fallbackLine) === rewardId) {
    return {
      ...fallbackLine,
      id: rewardId,
      productId: rewardId,
      name: fallbackLine.name || name || 'Free item',
    };
  }
  return {
    id: rewardId,
    productId: rewardId,
    name: name || 'Free item',
    image: image || undefined,
    imageUrl: image || undefined,
    images: image ? [image] : undefined,
    price: 0,
  };
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
 * Ensures buy-X-get-Y free units appear as their own cart row.
 * Same-SKU: free clone of paid product.
 * Cross: free row is the reward SKU (cart match or rule snapshot).
 */
export function expandCartItemsWithBundleRewards(items) {
  if (!Array.isArray(items) || !items.length) return [];

  const paidLines = stripPaidCartLinesOnly(items);
  const rewardLines = items.filter((it) => isBundleRewardCartLine(it));
  /** @type {Map<string, number>} free units claimed from reward product lines */
  const claimedFreeByRewardPid = new Map();
  const out = [];

  for (const paid of paidLines) {
    const parentId = String(paid.cartItemId ?? paid.id ?? paid.productId ?? '');
    if (!parentId) continue;
    const rule = getCartLineBundleRule(paid);
    const pid = cartLineProductId(paid);

    if (rule && isCrossSkuBundleRule(rule) && bundleRuleRoleForProduct(rule, pid) === 'get') {
      // Handled after buy parents (residual paid qty).
      continue;
    }

    out.push(paid);

    if (rule && isCrossSkuBundleRule(rule) && bundleRuleRoleForProduct(rule, pid) === 'buy') {
      const freeQty = getCrossFreeQtyFromBuyLine(paid, rule);
      if (freeQty <= 0) continue;
      const rewardPid = rewardProductIdFromRule(rule);
      const matchingRewardPaid = paidLines.find(
        (l) => cartLineProductId(l) === rewardPid && !isBundleRewardCartLine(l),
      );
      const apiReward = rewardLines.find((r) => bundleRewardMatchesParent(r, parentId));
      if (apiReward) {
        const productId = cartLineProductId(apiReward) || rewardPid;
        const snap = rewardSnapshotFromRule(rule, matchingRewardPaid);
        const snapImage =
          snap?.imageUrl || snap?.image || (Array.isArray(snap?.images) ? snap.images[0] : null);
        const apiImage =
          apiReward.imageUrl ||
          apiReward.image_url ||
          apiReward.image ||
          (Array.isArray(apiReward.images) ? apiReward.images[0] : null);
        const image = (typeof apiImage === 'string' && apiImage.trim()) || snapImage || undefined;
        out.push({
          ...apiReward,
          productId: productId || apiReward.productId,
          quantity: Math.max(1, Number(apiReward.quantity) || freeQty),
          displayQuantity: Math.max(1, Number(apiReward.displayQuantity) || freeQty),
          freeQuantity: Math.max(1, Number(apiReward.freeQuantity) || freeQty),
          price: 0,
          lineTotal: 0,
          total: 0,
          ...(image
            ? {
                image,
                imageUrl: image,
                images: Array.isArray(apiReward.images) && apiReward.images.length
                  ? apiReward.images
                  : [image],
              }
            : {}),
        });
      } else {
        const synthetic = buildSyntheticBundleRewardLine(paid, freeQty, parentId, {
            rule,
            rewardProduct: rewardSnapshotFromRule(rule, matchingRewardPaid),
          });
        if (synthetic) out.push(synthetic);
      }
      if (rewardPid) {
        claimedFreeByRewardPid.set(
          rewardPid,
          (claimedFreeByRewardPid.get(rewardPid) || 0) + freeQty,
        );
      }
      continue;
    }

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
      const synthetic = buildSyntheticBundleRewardLine(paid, freeQty, parentId, { rule });
      if (synthetic) out.push(synthetic);
    }
  }

  // Reward SKUs: keep residual paid qty after free claim; if none claimed, show as paid.
  for (const paid of paidLines) {
    const pid = cartLineProductId(paid);
    if (!pid) continue;
    const rule = getCartLineBundleRule(paid);
    if (!(rule && isCrossSkuBundleRule(rule) && bundleRuleRoleForProduct(rule, pid) === 'get')) {
      continue;
    }
    const paidQty = getCartLinePaidQty(paid);
    const claimed = claimedFreeByRewardPid.get(pid) || 0;
    const residual = Math.max(0, paidQty - claimed);
    if (residual <= 0) continue;
    out.push({
      ...paid,
      quantity: residual,
      paid_quantity: residual,
      paidQuantity: residual,
      offer_quantity: 0,
      offerQuantity: 0,
      free_quantity: 0,
      freeQuantity: 0,
      displayQuantity: residual,
      display_quantity: residual,
      lineTotal:
        Number.isFinite(Number(paid.price)) && Number(paid.price) > 0
          ? Number(paid.price) * residual
          : paid.lineTotal,
    });
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
          autoCartDiscountMinor:
            Number(autoRaw?.auto_cart_discount_minor ?? autoRaw?.autoCartDiscountMinor ?? 0) || 0,
          hasSkuPromo:
            types.includes('sku') || !!(autoRaw?.has_sku_promo ?? autoRaw?.hasSkuPromo),
          hasBundle:
            types.includes('bundle') || !!(autoRaw?.has_bundle ?? autoRaw?.hasBundle),
          hasAutoCart: !!(autoRaw?.has_auto_cart ?? autoRaw?.hasAutoCart),
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

/**
 * POST /storefront/cart/preview prices the client cart lines.
 * After local-cart checkout, ignore empty previews while the shopper still has lines.
 * Works with or without a coupon code.
 */
export function isTrustedCartCouponPreview(previewCart, localItems) {
  if (!stripPaidCartLinesOnly(localItems).length) return false;
  return stripPaidCartLinesOnly(previewCart?.items).length > 0;
}

/**
 * Overlay server preview unit/MRP/line totals onto local display cart lines.
 * Matches paid lines by productId; leaves qty and cart keys from local.
 * @param {object} [options]
 * @param {boolean} [options.ignoreCouponPricing] — BXGY carts: never take coupon-reduced
 *   payable; keep list/catalog × paid qty so coupons cannot stack with offers.
 */
export function mergePreviewPricingOntoLocalLines(
  localDisplayItems,
  previewItems,
  options = {}
) {
  if (!Array.isArray(localDisplayItems) || !localDisplayItems.length) return localDisplayItems || [];
  if (!Array.isArray(previewItems) || !previewItems.length) return localDisplayItems;

  const ignoreCouponPricing = options.ignoreCouponPricing === true;
  const cartIsBxgy =
    ignoreCouponPricing || cartHasBxgyOffer(localDisplayItems);

  const byProductId = new Map();
  for (const preview of previewItems) {
    if (isBundleRewardCartLine(preview)) continue;
    const pid = String(preview?.productId ?? preview?.product?.id ?? preview?.id ?? '').trim();
    if (!pid) continue;
    if (!byProductId.has(pid)) byProductId.set(pid, preview);
  }

  return localDisplayItems.map((local) => {
    if (isBundleRewardCartLine(local)) return local;
    const pid = String(local?.productId ?? local?.product?.id ?? local?.id ?? '').trim();
    const preview = pid ? byProductId.get(pid) : null;
    if (!preview) return local;

    const next = { ...local };
    const isBxgyLine =
      cartIsBxgy &&
      (getCartLineBundleRule(local) ||
        getBundleFreeExtraOnPaidLine(local) > 0 ||
        Boolean(preview.free_quantity || preview.freeQuantity));

    if (isBxgyLine) {
      const paid = getCartLinePaidQty(local);
      const sizeList = Number(local.selectedSize?.price);
      const sizeOrig = Number(local.selectedSize?.originalPrice);
      const localList = Number(
        local.originalPrice ??
          local.compareAtPrice ??
          local.listPrice ??
          local.mrp ??
          NaN,
      );
      const localPay = Number(
        local.price ?? local.offerPrice ?? local.offerPriceEffective,
      );
      const previewList = Number(
        preview.originalPrice ?? preview.compareAtPrice ?? preview.listPrice ?? preview.mrp
      );
      const previewPay = Number(preview.price);

      const listUnit = pickSaneListUnit([
        localList,
        previewList,
        sizeOrig,
        sizeList,
      ]);

      // Permanent: catalog offer wins over preview list-as-pay.
      const sellUnit = pickMergedSellUnderList(localPay, previewPay, listUnit);

      const listForDisplay =
        listUnit != null && sellUnit != null && listUnit > sellUnit + 1e-9
          ? listUnit
          : null;

      if (sellUnit != null && sellUnit > 0 && paid > 0) {
        next.price = sellUnit;
        next.originalPrice = listForDisplay;
        next.lineTotal = lineTotalFromUnitPricing(sellUnit, paid, local);
        next.total = next.lineTotal;
        if (local.selectedSize && typeof local.selectedSize === 'object') {
          next.selectedSize = {
            ...local.selectedSize,
            price:
              listForDisplay != null
                ? listForDisplay
                : Number(local.selectedSize.price) > 0 &&
                    (listForDisplay == null ||
                      Number(local.selectedSize.price) <= listForDisplay * 2 + 1e-9)
                  ? Number(local.selectedSize.price)
                  : sellUnit,
            ...(listForDisplay != null ? { originalPrice: listForDisplay } : {}),
          };
        }
      }
      if (preview.free_quantity != null || preview.freeQuantity != null) {
        const free = Number(preview.free_quantity ?? preview.freeQuantity) || 0;
        next.free_quantity = free;
        next.freeQuantity = free;
        next.offer_quantity = free;
        next.offerQuantity = free;
      }
      if (preview.displayQuantity != null) {
        next.displayQuantity = Number(preview.displayQuantity) || next.displayQuantity;
      }
      return next;
    }

    if (preview.price != null && Number.isFinite(Number(preview.price))) {
      next.price = Number(preview.price);
    }
    const previewList = Number(
      preview.originalPrice ?? preview.compareAtPrice ?? preview.listPrice ?? preview.mrp
    );
    const localListKeep = Number(
      local.originalPrice ?? local.compareAtPrice ?? local.listPrice ?? local.mrp
    );
    const pay = Number(next.price);
    const bestList = [previewList, localListKeep]
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((a, b) => (a == null || b > a ? b : a), null);
    if (bestList != null && Number.isFinite(pay) && bestList > pay + 1e-9) {
      next.originalPrice = bestList;
    } else if (
      next.originalPrice == null &&
      Number.isFinite(localListKeep) &&
      Number.isFinite(pay) &&
      localListKeep > pay + 1e-9
    ) {
      next.originalPrice = localListKeep;
    }
    if (preview.lineTotal != null && Number.isFinite(Number(preview.lineTotal))) {
      next.lineTotal = Number(preview.lineTotal);
      next.total = Number(preview.lineTotal);
    }
    if (preview.free_quantity != null || preview.freeQuantity != null) {
      const free = Number(preview.free_quantity ?? preview.freeQuantity) || 0;
      next.free_quantity = free;
      next.freeQuantity = free;
      next.offer_quantity = free;
      next.offerQuantity = free;
    }
    if (preview.displayQuantity != null) {
      next.displayQuantity = Number(preview.displayQuantity) || next.displayQuantity;
    }
    return next;
  });
}

function linePayableMajor(item) {
  if (isBundleRewardCartLine(item)) return 0;
  const line = Number(item?.lineTotal);
  // Treat missing/null/0 lineTotal as unset so allocate uses catalog × qty.
  if (Number.isFinite(line) && line > 0) return line;
  const unit = Number(item?.price) || 0;
  return lineTotalFromUnitPricing(unit, getCartLinePaidQty(item), item);
}

/**
 * Ensure each paid line carries catalog list vs offer for OFF UI.
 * List = max(MRP/original/selectedSize when above pay); pay stays the sell unit.
 * Does not invent discounts — only surfaces fields already on the line.
 */
export function normalizeCartLineCatalogPricing(item) {
  if (!item || isBundleRewardCartLine(item)) return item;
  const paidQty = getCartLinePaidQty(item);
  const line = Number(item.lineTotal);
  const priceUnit = Number(item.price) || 0;
  const fromLine =
    Number.isFinite(line) && line > 0 && paidQty > 0 ? line / paidQty : 0;
  // Prefer item.price when lineTotal was crushed by a bad cart-level allocate.
  let payUnit = priceUnit > 0 ? priceUnit : fromLine;
  if (
    priceUnit > 0 &&
    fromLine > 0 &&
    fromLine < priceUnit * 0.5 - 1e-9
  ) {
    payUnit = priceUnit;
  }
  if (!(payUnit > 0)) {
    payUnit = Number(item.offerPrice ?? item.offerPriceEffective) || 0;
  }
  if (!(payUnit > 0)) return item;

  const listCandidates = [
    item.originalPrice,
    item.compareAtPrice,
    item.listPrice,
    item.mrp,
    item.actualPrice,
    item.selectedSize?.originalPrice,
    item.selectedSize?.compareAtPrice,
    item.selectedSize?.mrp,
    // ProductCard sizes store list/tag on selectedSize.price while item.price is offer.
    item.selectedSize?.price,
    item.product?.originalPrice,
    item.product?.compareAtPrice,
    item.product?.listPrice,
    item.product?.mrp,
  ];
  let listUnit = null;
  for (const raw of listCandidates) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (listUnit == null || n > listUnit) listUnit = n;
  }
  if (listUnit == null || !(listUnit > payUnit + 1e-9)) {
    // No catalog gap — still keep lineTotal in sync with pay × qty.
    const lineTotal = Math.round(lineTotalFromUnitPricing(payUnit, paidQty, item) * 100) / 100;
    if (Number(item.lineTotal) === lineTotal && Number(item.price) === payUnit) {
      return item;
    }
    return { ...item, price: payUnit, lineTotal, total: lineTotal };
  }

  const lineTotal = Math.round(lineTotalFromUnitPricing(payUnit, paidQty, item) * 100) / 100;
  const next = {
    ...item,
    price: payUnit,
    lineTotal,
    total: lineTotal,
    originalPrice: listUnit,
  };
  if (item.selectedSize && typeof item.selectedSize === 'object') {
    next.selectedSize = {
      ...item.selectedSize,
      // Keep size.price as list/tag for footer MRP helpers.
      price:
        Number(item.selectedSize.price) > payUnit + 1e-9
          ? Number(item.selectedSize.price)
          : listUnit,
      originalPrice:
        Number(item.selectedSize.originalPrice) > payUnit + 1e-9
          ? Number(item.selectedSize.originalPrice)
          : listUnit,
    };
  }
  return next;
}

export function normalizeCartLinesCatalogPricing(items) {
  if (!Array.isArray(items) || !items.length) return items || [];
  return items.map(normalizeCartLineCatalogPricing);
}

/** Catalog / shelf unit for a paid cart line (list preferred over sell). */
export function cartLineShelfUnit(item) {
  if (!item || isBundleRewardCartLine(item)) return 0;
  const candidates = [
    item.originalPrice,
    item.compareAtPrice,
    item.listPrice,
    item.mrp,
    item.selectedSize?.originalPrice,
    item.selectedSize?.compareAtPrice,
    item.selectedSize?.mrp,
    item.selectedSize?.price,
    item.price,
  ];
  let best = 0;
  for (const raw of candidates) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (n > best) best = n;
  }
  return best;
}

/** Sum of shelf unit × paid qty across paid lines. */
export function sumCartShelfPayable(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce((sum, it) => {
    if (isBundleRewardCartLine(it)) return sum;
    const unit = cartLineShelfUnit(it);
    const paid = getCartLinePaidQty(it);
    if (!(unit > 0) || !(paid > 0)) return sum;
    return sum + unit * paid;
  }, 0);
}

/**
 * Reset paid lines to shelf (catalog) payable so allocate's linesSum is the
 * real pre-discount total, not a sticky reduced lineTotal.
 * @deprecated Prefer normalizeCartLinesCatalogPricing + allocate to displayCartTotal.
 */
export function resetCartLinesToShelfPayable(items) {
  if (!Array.isArray(items) || !items.length) return items || [];
  return items.map((it) => {
    if (isBundleRewardCartLine(it)) return it;
    const shelfUnit = cartLineShelfUnit(it);
    if (!(shelfUnit > 0)) return it;
    const paidQty = getCartLinePaidQty(it);
    if (!(paidQty > 0)) return it;
    const shelfLine = Math.round(shelfUnit * paidQty * 100) / 100;
    const next = {
      ...it,
      price: shelfUnit,
      lineTotal: shelfLine,
      total: shelfLine,
      originalPrice:
        Number(it.originalPrice) > shelfUnit + 1e-9
          ? Number(it.originalPrice)
          : shelfUnit,
    };
    if (it.selectedSize && typeof it.selectedSize === 'object') {
      const sizeList =
        Number(it.selectedSize.originalPrice) > shelfUnit + 1e-9
          ? Number(it.selectedSize.originalPrice)
          : shelfUnit;
      next.selectedSize = {
        ...it.selectedSize,
        price: shelfUnit,
        originalPrice: sizeList,
      };
    }
    return next;
  });
}

/**
 * @deprecated Do not use for UI. Cart-level auto/coupon discounts must stay in the
 * bill summary — spreading payable onto lines invents fake catalog SAVE/OFF
 * (e.g. ₹220 → ₹2.22 when a ~99.5% auto-cart rule applies).
 * Kept as a no-op so older callers do not crush prices again.
 */
export function allocateCartPayableOntoLines(items, _payableTotal) {
  return Array.isArray(items) ? items : items || [];
}

