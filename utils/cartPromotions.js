/**
 * Storefront cart promotion helpers (SKU campaigns, bundle BOGO reward lines).
 */

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
  return {
    paid,
    free: Number(item?.free_quantity ?? item?.freeQuantity) || 0,
    display: Number(item?.display_quantity ?? item?.displayQuantity) || paid,
    billable: Number(item?.billable_quantity ?? item?.billableQuantity) || paid,
  };
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

/** Free units on a paid line (from API `free_quantity` or `display_quantity − paid`). */
export function getBundleFreeExtraOnPaidLine(item) {
  if (!item || isBundleRewardCartLine(item)) return 0;
  const nested = readQuantityFields(item);
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
  return items.some((it) => {
    if (!isBundleRewardCartLine(it)) return false;
    const rid = String(it.cartItemId ?? it.id ?? '');
    if (rid === `${pid}:bundle-reward`) return true;
    return (
      String(
        it.bundleSourceCartItemId ??
          it.bundle_source_item_id ??
          it.bundle_source_cart_item_id ??
          ''
      ) === pid
    );
  });
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
    displayQuantity: paid + free,
    freeQuantity: free,
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
 * Idempotent when the API already returns `…:bundle-reward` lines.
 */
export function expandCartItemsWithBundleRewards(items) {
  if (!Array.isArray(items) || !items.length) return [];

  const out = [...items];

  for (const paid of items) {
    if (isBundleRewardCartLine(paid)) continue;
    const parentId = String(paid.cartItemId ?? paid.id ?? '');
    if (!parentId || hasBundleRewardForParent(out, parentId)) continue;

    const freeQty = getBundleFreeExtraOnPaidLine(paid);
    if (freeQty <= 0) continue;

    out.push(buildSyntheticBundleRewardLine(paid, freeQty, parentId));
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

export function formatCouponIneligibilityHint(codes) {
  const list = Array.isArray(codes) ? codes : [];
  if (!list.length) return null;
  if (list.includes('MIN_SUBTOTAL_NOT_MET')) return 'Cart subtotal is below the minimum for this coupon';
  if (list.includes('FIRST_ORDER_ONLY_NOT_MET')) return 'Valid on first order only';
  if (list.includes('NEW_CUSTOMER_ONLY_NOT_MET')) return 'Valid for new customers only';
  return 'Not applicable to this order';
}
