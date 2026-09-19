/**
 * Order-level and line-level promotion display helpers (storefront orders API).
 */

import {
  getPrimaryBundleRule,
  isCrossSkuBundleRule,
} from "./productUtils";

export function parseOrderQuantity(raw) {
  const n = parseFloat(String(raw ?? "1"));
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
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  return false;
}

function falsyAvailabilityFlag(value) {
  if (value === false || value === 0) return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "false" || s === "0" || s === "no";
  }
  return false;
}

function parseOptionalQty(raw) {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) ? n : null;
}

const SHOP_ACTOR_ROLES = new Set([
  "shop",
  "admin",
  "merchant",
  "picker",
  "staff",
  "store",
]);

function shopActorFromItem(item) {
  const raw =
    item.added_by ??
    item.addedBy ??
    item.source ??
    item.line_source ??
    item.lineSource ??
    item.origin ??
    item.created_by_role ??
    item.createdByRole ??
    "";
  return SHOP_ACTOR_ROLES.has(String(raw).trim().toLowerCase());
}

function shopEditOriginalQuantityRaw(item) {
  // Prefer explicit "what customer ordered" fields. Do NOT use ordered_quantity /
  // orderedQuantity here — storefront checkout stores those as BXGY *paid* units.
  return (
    item.originalQuantity ??
    item.original_quantity ??
    item.placedQuantity ??
    item.placed_quantity ??
    item.requestedQuantity ??
    item.requested_quantity ??
    item.customerQuantity ??
    item.customer_quantity ??
    null
  );
}

function shopEditOriginalQuantityRawWithOrderedFallback(item) {
  const preferred = shopEditOriginalQuantityRaw(item);
  if (preferred != null && preferred !== "") return preferred;
  // Shop API qty edits: orderedQuantity is pre-edit qty when free split is absent.
  const freeQty = parseOptionalQty(
    item.offer_quantity ??
      item.offerQuantity ??
      item.free_quantity ??
      item.freeQuantity,
  );
  const paidQty = parseOptionalQty(
    item.paid_quantity ?? item.paidQuantity,
  );
  if ((freeQty != null && freeQty > 0) || (paidQty != null && paidQty === 0)) {
    return null;
  }
  if (truthyFlag(item.quantityAdjusted) || truthyFlag(item.quantity_adjusted)) {
    return item.orderedQuantity ?? item.ordered_quantity ?? null;
  }
  return null;
}

/**
 * Shop added this line after the customer placed, or changed qty.
 * @returns {{ shopAdded: boolean, shopEdited: boolean }}
 */
export function detectShopLineEdit(item, opts = {}) {
  if (!item || typeof item !== "object") {
    return { shopAdded: false, shopEdited: false };
  }

  const currentQty =
    opts.quantity != null ? Number(opts.quantity) : parseOrderQuantity(item.quantity);

  const shopAdded =
    truthyFlag(item.shopAdded) ||
    truthyFlag(item.added_by_shop) ||
    truthyFlag(item.addedByShop) ||
    truthyFlag(item.shop_added) ||
    truthyFlag(item.shopAddedLine) ||
    truthyFlag(item.added_after_placement) ||
    truthyFlag(item.addedAfterPlacement) ||
    shopActorFromItem(item);

  const explicitAdjust =
    truthyFlag(item.quantityAdjusted) ||
    truthyFlag(item.quantity_adjusted) ||
    truthyFlag(item.shopQuantityAdjusted) ||
    truthyFlag(item.shopQuantityUpdated) ||
    truthyFlag(item.shop_quantity_updated) ||
    truthyFlag(item.shopUpdated) ||
    truthyFlag(item.shop_updated);

  const rawOriginal =
    opts.originalQuantity ?? shopEditOriginalQuantityRawWithOrderedFallback(item);
  const parsedOriginal = parseOptionalQty(rawOriginal);
  const originalZero = parsedOriginal === 0;
  const originalPositive = parsedOriginal != null && parsedOriginal > 0;
  const qtyDiffers =
    originalPositive &&
    Number.isFinite(currentQty) &&
    Math.abs(parsedOriginal - currentQty) > 1e-6;

  const inferredAdded = originalZero && currentQty > 0;

  const confirmedFree = isConfirmedFreeRewardLine(item);
  if (confirmedFree && !shopAdded && !explicitAdjust) {
    return { shopAdded: false, shopEdited: false };
  }

  // BXGY paid/free split is not a shop edit.
  const paid = parseOptionalQty(item.paid_quantity ?? item.paidQuantity);
  const free = parseOptionalQty(
    item.free_quantity ?? item.freeQuantity ?? item.offer_quantity ?? item.offerQuantity,
  );
  if (
    !shopAdded &&
    !explicitAdjust &&
    ((paid != null && free != null && free > 0) ||
      (paid != null && paid < currentQty && paid >= 0))
  ) {
    return { shopAdded: false, shopEdited: false };
  }

  return {
    shopAdded: shopAdded || inferredAdded,
    shopEdited: shopAdded || inferredAdded || explicitAdjust || qtyDiffers,
  };
}

/**
 * Confirmed free BXGY / bundle reward — not merely applied_promotion_ids.
 * Aligns with cart `isBundleRewardCartLine` + free/offer quantity fields.
 */
export function isConfirmedFreeRewardLine(item) {
  if (!item || typeof item !== "object") return false;
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
  const id = String(item.id ?? item.cartItemId ?? "");
  if (id.endsWith(":bundle-reward")) return true;

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
    .filter((v) => v != null && v !== "")
    .map((v) =>
      String(v)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_"),
    )
    .join(" ");
  if (
    statusBlob &&
    (statusBlob.includes("free_reward") ||
      statusBlob.includes("bundle_reward") ||
      statusBlob === "free" ||
      statusBlob === "reward")
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
      item.freeQty,
  );
  if (freeQty != null && freeQty > 0 && qty > 0 && freeQty >= qty - 1e-9) {
    return true;
  }

  const paidQty = parseOptionalQty(
    item.paid_quantity ??
      item.paidQuantity ??
      item.billable_quantity ??
      item.billableQuantity,
  );
  if (
    paidQty != null &&
    paidQty <= 0 &&
    qty > 0 &&
    freeQty != null &&
    freeQty > 0
  ) {
    return true;
  }

  return false;
}

/** Infer paid units from line totals when API sends bundle display qty on one row. */
export function inferOrderLinePaidQuantity(item) {
  if (isConfirmedFreeRewardLine(item)) return 0;
  const qty = parseOrderQuantity(item?.quantity);

  const paidExplicit = parseOptionalQty(
    item?.paid_quantity ??
      item?.paidQuantity ??
      item?.billable_quantity ??
      item?.billableQuantity,
  );
  if (paidExplicit != null && paidExplicit >= 0 && paidExplicit <= qty + 1e-9) {
    return paidExplicit;
  }

  // Storefront checkout: ordered_quantity = paid units (not shop-edit original).
  const orderedAsPaid = parseOptionalQty(
    item?.ordered_quantity ?? item?.orderedQuantity,
  );
  const freeHint = parseOptionalQty(
    item?.offer_quantity ??
      item?.offerQuantity ??
      item?.free_quantity ??
      item?.freeQuantity,
  );
  if (
    orderedAsPaid != null &&
    orderedAsPaid >= 0 &&
    orderedAsPaid <= qty + 1e-9 &&
    (freeHint != null ||
      orderedAsPaid < qty ||
      truthyFlag(item?.is_bundle_reward) ||
      truthyFlag(item?.isBundleReward))
  ) {
    // Only trust ordered as paid when free split is indicated or qty > ordered.
    if (freeHint != null || orderedAsPaid < qty) {
      return orderedAsPaid;
    }
  }

  if (freeHint != null && freeHint > 0 && freeHint < qty) {
    return Math.max(0, qty - freeHint);
  }

  let unitMinor = parseMinorInt(
    item?.unit_price_minor_snapshot ??
      item?.unitPriceMinorSnapshot ??
      item?.unitPriceMinor,
  );
  let lineMinor = parseMinorInt(item?.line_total_minor ?? item?.lineTotalMinor);
  if (unitMinor <= 0 && item?.unitPrice != null) {
    unitMinor = Math.round(Number(item.unitPrice) * 100);
  }
  if (lineMinor <= 0 && item?.totalPrice != null) {
    lineMinor = Math.round(Number(item.totalPrice) * 100);
  }
  // Fully free cross reward: ₹0 line with catalog unit price.
  if (qty > 0 && lineMinor <= 0 && unitMinor > 0) {
    const listMinor = parseMinorInt(item?.list_price_minor ?? item?.listPriceMinor);
    if (listMinor > 0 || truthyFlag(item?.is_bundle_reward) || truthyFlag(item?.isBundleReward)) {
      return 0;
    }
  }
  if (unitMinor > 0 && lineMinor > 0) {
    const paid = Math.round(lineMinor / unitMinor);
    if (paid >= 1 && paid <= qty) return paid;
  }
  if (qty > 0 && lineMinor <= 0 && (unitMinor > 0 || parseMinorInt(item?.list_price_minor ?? item?.listPriceMinor) > 0)) {
    return 0;
  }
  return qty;
}

/**
 * When checkout collapses same-SKU B1G1 into quantity = paid+free with no split,
 * invert bundleRules to recover { paid, free }.
 * Returns null when rules are missing / cross-SKU / no match.
 */
export function inferSameSkuBxgyPaidFree(displayQty, productOrItem) {
  const qty = Number(displayQty);
  if (!Number.isFinite(qty) || qty < 1) return null;

  const product =
    productOrItem?.product && typeof productOrItem.product === "object"
      ? {
          ...productOrItem.product,
          id:
            productOrItem.product.id ??
            productOrItem.productId ??
            productOrItem.product_id ??
            productOrItem.id,
          bundleRules:
            productOrItem.product.bundleRules ??
            productOrItem.product.bundle_rules ??
            productOrItem.bundleRules ??
            productOrItem.bundle_rules,
        }
      : {
          id:
            productOrItem?.productId ??
            productOrItem?.product_id ??
            productOrItem?.id,
          bundleRules:
            productOrItem?.bundleRules ?? productOrItem?.bundle_rules,
          bundle_rules:
            productOrItem?.bundle_rules ?? productOrItem?.bundleRules,
        };

  const rule = getPrimaryBundleRule(product);
  if (!rule || isCrossSkuBundleRule(rule)) return null;

  const buy = Number(rule.buy_qty ?? rule.buyQty);
  const get = Number(rule.get_qty ?? rule.getQty);
  const reward = rule.reward_type ?? rule.rewardType;
  if (!Number.isFinite(buy) || buy <= 0 || !Number.isFinite(get) || get <= 0) {
    return null;
  }
  if (reward && String(reward).toLowerCase() !== "free") return null;

  // Prefer exact inverse: paid + floor(paid/buy)*get === displayQty
  for (let paid = Math.floor(qty); paid >= 1; paid -= 1) {
    const free = Math.floor(paid / buy) * get;
    if (Math.abs(paid + free - qty) < 1e-9 && free > 0) {
      return { paid, free };
    }
  }

  // B1G1 even-qty shortcut when floating qty rounding interfered
  if (buy === 1 && get === 1 && Math.abs(qty % 2) < 1e-9 && qty >= 2) {
    const paid = qty / 2;
    return { paid, free: paid };
  }

  return null;
}

export function getOrderLineOfferLabel(item) {
  if (!item || item.isDeleted === true) return null;
  const paid = inferOrderLinePaidQuantity(item);
  const displayQty = parseOrderQuantity(item?.quantity);
  const freeReward = isConfirmedFreeRewardLine(item);
  const lineDiscMajor =
    item?.lineDiscount != null
      ? Number(item.lineDiscount)
      : minorToMajor(
          parseMinorInt(item?.line_discount_minor ?? item?.lineDiscountMinor),
        );
  const total = Number(item?.totalPrice ?? 0);
  const unit = Number(item?.unitPrice ?? item?.price ?? 0);
  const list = Number(item?.listPrice ?? item?.list_price ?? 0);

  if (freeReward || (paid === 0 && displayQty > 0 && total < 0.01)) {
    return "FREE";
  }
  if (paid > 0 && displayQty > paid) {
    return "BOGO";
  }
  // Cross buy line: payable qty with companion free reward promo — short BUY badge.
  if (
    paid > 0 &&
    paid === displayQty &&
    Array.isArray(item?.appliedPromotionIds ?? item?.applied_promotion_ids) &&
    (item.appliedPromotionIds ?? item.applied_promotion_ids).length > 0 &&
    (truthyFlag(item?.isBxgyBuyLine) || truthyFlag(item?.is_bxgy_buy_line))
  ) {
    return "BUY";
  }
  // Catalog sale: list above pay (or explicit line discount on a payable line).
  if (list > 0 && unit > 0 && list > unit + 0.009 && total > 0.009) {
    return "Offer";
  }
  if (lineDiscMajor > 0.009 && total > 0.009) {
    return "Offer";
  }
  return null;
}

/**
 * True when the order has Buy X Get Y / free-reward lines (coupons must not show as applied).
 */
export function orderHasBxgyOffer(items) {
  const list = Array.isArray(items) ? items : [];
  for (const it of list) {
    if (!it || it.isDeleted === true) continue;
    if (it.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(it)) return true;
    const paid = inferOrderLinePaidQuantity(it);
    const displayQty = parseOrderQuantity(it.quantity);
    if (paid > 0 && displayQty > paid) return true;
    const label = getOrderLineOfferLabel(it);
    if (label === 'BOGO' || label === 'FREE') return true;
  }
  return false;
}

/**
 * Display savings for a line. BXGY/BOGO uses product price × free qty — never
 * raw `lineDiscount` (that field often includes leftover coupon / list stacking).
 */
export function getOrderLineOfferSavingsMajor(item) {
  if (!item || item.isDeleted === true) return 0;
  const paid = inferOrderLinePaidQuantity(item);
  const displayQty = parseOrderQuantity(item.quantity);
  const freeReward = item.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(item);
  const unit = Number(item.unitPrice ?? item.price ?? item.listPrice ?? 0);
  if (!Number.isFinite(unit) || unit <= 0) return 0;

  // Savings live on the paid/mixed row (unit × free). Do not also count a
  // separate FREE sibling — that would double the BOGO amount.
  if (paid > 0 && displayQty > paid) {
    return unit * (displayQty - paid);
  }
  if (freeReward && !(paid > 0)) {
    // Cross free line: savings = catalog unit × qty (shown on FREE row only).
    const list = Number(item.listPrice ?? item.list_price ?? 0);
    const catalog = list > 0 ? list : unit;
    if (catalog > 0 && displayQty > 0) return catalog * displayQty;
    return 0;
  }

  const lineDisc =
    item.lineDiscount != null
      ? Number(item.lineDiscount)
      : minorToMajor(parseMinorInt(item.line_discount_minor ?? item.lineDiscountMinor));
  const list = Number(item.listPrice ?? item.list_price ?? 0);
  const total = Number(item.totalPrice ?? 0);
  const paidForGap = paid > 0 ? paid : displayQty;
  let catalogGap = 0;
  if (
    list > 0 &&
    paidForGap > 0 &&
    total > 0.009 &&
    list * paidForGap > total + 0.009
  ) {
    catalogGap = list * paidForGap - total;
  } else if (list > unit + 0.009 && paidForGap > 0) {
    catalogGap = (list - unit) * paidForGap;
  }

  const discOk = Number.isFinite(lineDisc) && lineDisc > 0.009 && total > 0.009;
  if (discOk && catalogGap > 0.009) {
    return Math.max(lineDisc, catalogGap);
  }
  if (catalogGap > 0.009) return catalogGap;
  if (discOk) return lineDisc;
  return 0;
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
  if (!item || typeof item !== "object") return false;

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
    .filter((v) => v != null && v !== "")
    .map((v) =>
      String(v)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_"),
    )
    .join(" ");

  if (statusBlob) {
    if (
      statusBlob.includes("unavail") ||
      statusBlob.includes("out_of_stock") ||
      statusBlob.includes("oos") ||
      statusBlob.includes("removed") ||
      statusBlob.includes("cancel") ||
      statusBlob.includes("not_available") ||
      statusBlob.includes("rejected")
    ) {
      return true;
    }
  }

  const currentQty =
    opts.quantity != null
      ? Number(opts.quantity)
      : parseOrderQuantity(item.quantity);

  let originalQty = opts.originalQuantity;
  if (originalQty == null) {
    const rawOriginal = shopEditOriginalQuantityRawWithOrderedFallback(item);
    if (rawOriginal != null && rawOriginal !== "") {
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
    item.fulfilled_quantity ??
      item.fulfilledQuantity ??
      item.shop_quantity ??
      item.shopQuantity,
  );
  const orderedUnits =
    originalQty != null && originalQty > 0
      ? originalQty
      : Number.isFinite(currentQty) && currentQty > 0
        ? currentQty
        : null;
  if (
    fulfillQty != null &&
    fulfillQty <= 0 &&
    orderedUnits != null &&
    orderedUnits > 0
  ) {
    return true;
  }

  const pickedQty = parseOptionalQty(
    item.picked_quantity ?? item.pickedQuantity,
  );
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

  // Catalog-present + ₹0 payable alone is NOT unavailable — that shape is common
  // for BXGY / full promo discounts and was falsely labeled UNAVAILABLE before any
  // picker/admin action. Hard signals above remain authoritative.
  return false;
}

/**
 * Line fulfilled by shop: removed line, or qty changed from what customer ordered.
 * Backend may send `originalQuantity`, `isDeleted`, `quantityAdjusted`, etc.
 */
export function getShopLineFulfillmentMeta(item) {
  if (!item || typeof item !== "object") {
    return {
      isDeleted: false,
      currentQty: 1,
      originalQty: null,
      showRemoved: false,
      showShopQtyUpdate: false,
      shopAdded: false,
      shopEdited: false,
    };
  }

  const currentQty = parseOrderQuantity(item.quantity);

  const rawOriginal = shopEditOriginalQuantityRawWithOrderedFallback(item);
  let originalQty = null;
  if (rawOriginal != null && rawOriginal !== "") {
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

  const { shopAdded, shopEdited } = detectShopLineEdit(item, {
    quantity: currentQty,
    originalQuantity: originalQty,
  });

  const showShopQtyUpdate = !isDeleted && shopEdited;

  return {
    isDeleted,
    currentQty,
    originalQty,
    showRemoved: isDeleted,
    showShopQtyUpdate,
    shopAdded: !isDeleted && shopAdded,
    shopEdited: showShopQtyUpdate,
  };
}

/**
 * Parent paid line id for a free/reward order line (BXGY / bundle).
 */
export function getOrderFreeRewardParentId(item) {
  if (!item || typeof item !== "object") return "";
  const raw =
    item.bundleSourceCartItemId ??
    item.bundle_source_cart_item_id ??
    item.bundleSourceItemId ??
    item.bundle_source_item_id ??
    item.paidCartItemId ??
    item.paid_cart_item_id ??
    null;
  if (raw != null && String(raw).trim()) return String(raw).trim();
  const id = String(item.id ?? item.cartItemId ?? "");
  if (id.endsWith(":bundle-reward")) return id.replace(/:bundle-reward$/, "");
  return "";
}

export function getOrderPromotionSummary(order) {
  if (!order) {
    return {
      couponCode: null,
      couponCodes: [],
      promotionDiscountMinor: 0,
      promotionDiscountMajor: 0,
      couponDiscountMinor: 0,
      couponDiscountMajor: 0,
      autoPromotionDiscountMinor: 0,
      autoPromotionDiscountMajor: 0,
      appliedPromotionIds: [],
      hasPromotions: false,
    };
  }

  const couponCode =
    order.couponCode ??
    order.coupon_code_normalized ??
    order.coupon_code ??
    null;

  const couponCodes = Array.isArray(order.couponCodes)
    ? order.couponCodes
        .map((c) =>
          String(c || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean)
    : couponCode
      ? [String(couponCode).trim().toUpperCase()]
      : [];

  const promotionDiscountMinor = parseMinorInt(
    order.promotionDiscountMinor ??
      order.promotion_discount_total_minor ??
      order.promotionDiscountTotalMinor,
  );
  const couponDiscountMinor = parseMinorInt(
    order.couponDiscountMinor ?? order.coupon_discount_minor,
  );
  const autoPromotionDiscountMinor = parseMinorInt(
    order.autoPromotionDiscountMinor ??
      order.auto_promotion_discount_minor ??
      Math.max(0, promotionDiscountMinor - couponDiscountMinor),
  );

  const appliedPromotionIds = Array.isArray(order.appliedPromotionIds)
    ? order.appliedPromotionIds
    : Array.isArray(order.applied_promotion_ids)
      ? order.applied_promotion_ids
      : [];

  const hasPromotions =
    promotionDiscountMinor > 0 ||
    couponDiscountMinor > 0 ||
    autoPromotionDiscountMinor > 0 ||
    couponCodes.length > 0 ||
    Boolean(String(couponCode || "").trim()) ||
    appliedPromotionIds.length > 0;

  return {
    couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
    couponCodes,
    promotionDiscountMinor,
    promotionDiscountMajor: minorToMajor(promotionDiscountMinor),
    couponDiscountMinor,
    couponDiscountMajor: minorToMajor(couponDiscountMinor),
    autoPromotionDiscountMinor,
    autoPromotionDiscountMajor: minorToMajor(autoPromotionDiscountMinor),
    appliedPromotionIds,
    hasPromotions,
  };
}
