/**
 * Order API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from "./apiClient";
import { resolveShopId } from "./authApi";
import {
  minorToMajor,
  parseMinorInt,
  parseOrderQuantity,
  isOrderLineUnavailable,
  isConfirmedFreeRewardLine,
  inferOrderLinePaidQuantity,
  inferSameSkuBxgyPaidFree,
  orderHasBxgyOffer,
  detectShopLineEdit,
  getOrderFreeRewardParentId,
  getOrderLineOfferSavingsMajor,
} from "./orderPromotions";
import {
  hasMeaningfulCatalogOfferOnRaw,
  resolveCatalogListAndPay,
  parseMajorMoney,
} from "./catalogOfferPricing";
import {
  formatWeightUnitLabel,
  parseProductUnitSize,
  resolveProductWeightAndUnit,
} from "./productUtils";
import { PRODUCT_IMAGE_PLACEHOLDER } from "./productImages";
import { getProductById } from "./productApi";

function firstImageUrl(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.includes(",")) return s.split(",")[0].trim() || null;
  return s;
}

function resolveOrderItemImage(item = {}) {
  const nested =
    typeof item?.image === "object" && item?.image != null
      ? item.image.url
      : item?.image;
  return (
    firstImageUrl(item?.product_image_snapshot) ||
    firstImageUrl(item?.productImage) ||
    firstImageUrl(item?.product_image) ||
    firstImageUrl(item?.image_url) ||
    firstImageUrl(item?.imageUrl) ||
    firstImageUrl(item?.thumbnail_url) ||
    firstImageUrl(item?.thumbnailUrl) ||
    firstImageUrl(item?.thumbnail) ||
    firstImageUrl(nested) ||
    item?.product?.images?.[0] ||
    firstImageUrl(item?.product?.imageUrl) ||
    firstImageUrl(item?.product?.image) ||
    PRODUCT_IMAGE_PLACEHOLDER
  );
}

function parseOrderMajorMoney(raw) {
  return parseMajorMoney(raw);
}

/** Case-insensitive id compare (UUID / product ids). */
function orderProductIdsMatch(a, b) {
  const left = a != null ? String(a).trim().toLowerCase() : "";
  const right = b != null ? String(b).trim().toLowerCase() : "";
  return Boolean(left && right && left === right);
}

function orderLineProductId(item) {
  if (!item || typeof item !== "object") return "";
  const raw =
    item.product_id ?? item.productId ?? item.product?.id ?? null;
  return raw != null ? String(raw).trim() : "";
}

/** Only use nested product pricing when product.id matches the order line SKU. */
function orderLineProductPricingTrusted(item) {
  const lineId = orderLineProductId(item);
  const prodId = item?.product?.id;
  if (!lineId || prodId == null || !String(prodId).trim()) return false;
  return orderProductIdsMatch(lineId, prodId);
}

/** Catalog list/MRP for strike — shared sane-list picker. */
function resolveOrderLineListMajor(item, listPriceMinor, unitPriceRaw) {
  const { listUnit } = resolveCatalogListAndPay(item, {
    trustProduct: orderLineProductPricingTrusted(item),
    listPriceMinor,
    unitPriceRaw: unitPriceRaw > 0 ? unitPriceRaw : null,
  });
  return listUnit;
}

/**
 * Catalog offer pay — shared helper. Live product.offerPrice beats list-as-offer.
 */
function resolveOrderLineOfferUnit(item, listUnit, paidQty, lineTotal) {
  const { payUnit } = resolveCatalogListAndPay(item, {
    trustProduct: orderLineProductPricingTrusted(item),
    paidQty,
    lineTotal: paidQty > 0 && lineTotal > 0.009 ? lineTotal : null,
  });
  if (payUnit != null) {
    if (listUnit != null && !(payUnit < listUnit - 0.004)) return null;
    return payUnit;
  }
  return null;
}

function transformOrderItem(item) {
  if (!item) return null;
  const quantity = parseOrderQuantity(item.quantity);
  const unitPriceMinor = parseMinorInt(
    item.unit_price_minor_snapshot ?? item.unitPriceMinorSnapshot,
  );
  const hasLineTotalMinor =
    (item.line_total_minor != null && item.line_total_minor !== "") ||
    (item.lineTotalMinor != null && item.lineTotalMinor !== "");
  const lineTotalMinor = hasLineTotalMinor
    ? parseMinorInt(item.line_total_minor ?? item.lineTotalMinor)
    : null;
  const listPriceMinor = parseMinorInt(
    item.list_price_minor ?? item.listPriceMinor,
  );
  const lineDiscountMinor = parseMinorInt(
    item.line_discount_minor ?? item.lineDiscountMinor,
  );
  const appliedPromotionIds = Array.isArray(item.applied_promotion_ids)
    ? item.applied_promotion_ids
    : Array.isArray(item.appliedPromotionIds)
      ? item.appliedPromotionIds
      : [];
  const productName =
    item.product_name_snapshot ||
    item.productName ||
    item.product_name ||
    item.name ||
    "Product";
  const unitPriceRaw =
    unitPriceMinor > 0
      ? minorToMajor(unitPriceMinor)
      : parseFloat(item.unitPrice || item.unit_price || 0) || 0;

  const hasTotalPriceMajor =
    (item.totalPrice != null && item.totalPrice !== "") ||
    (item.total_price != null && item.total_price !== "");

  let totalPrice;
  let lineTotalExplicitZero = false;
  if (hasLineTotalMinor) {
    totalPrice = minorToMajor(lineTotalMinor);
    lineTotalExplicitZero = lineTotalMinor === 0;
  } else if (hasTotalPriceMajor) {
    const major = parseFloat(item.totalPrice ?? item.total_price);
    totalPrice = Number.isFinite(major) ? major : 0;
    lineTotalExplicitZero = totalPrice === 0;
  } else {
    totalPrice = null;
  }

  const listResolved = resolveOrderLineListMajor(
    item,
    listPriceMinor,
    unitPriceRaw,
  );

  const originalQuantity = (() => {
    const raw =
      item.originalQuantity ??
      item.original_quantity ??
      item.placedQuantity ??
      item.placed_quantity ??
      item.requestedQuantity ??
      item.requested_quantity ??
      null;
    if (raw == null || raw === "") {
      // Shop qty-edit only: orderedQuantity is pre-edit when not a BXGY paid split.
      const freeQ = item.free_quantity ?? item.freeQuantity ?? item.offer_quantity;
      const paidQ = item.paid_quantity ?? item.paidQuantity;
      const freeN = freeQ != null && freeQ !== "" ? parseFloat(String(freeQ)) : null;
      const paidN = paidQ != null && paidQ !== "" ? parseFloat(String(paidQ)) : null;
      const looksBxgy =
        (Number.isFinite(freeN) && freeN > 0) ||
        (Number.isFinite(paidN) && paidN === 0) ||
        item.is_bundle_reward === true ||
        item.isBundleReward === true ||
        item.is_confirmed_free_reward === true;
      if (
        !looksBxgy &&
        (item.quantityAdjusted === true || item.quantity_adjusted === true)
      ) {
        const ord = item.orderedQuantity ?? item.ordered_quantity;
        if (ord != null && ord !== "") {
          const n = parseFloat(String(ord));
          return Number.isFinite(n) && n > 0 ? n : null;
        }
      }
      return null;
    }
    const n = parseFloat(String(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const isConfirmedFreeReward = isConfirmedFreeRewardLine(item);
  const lineDiscountMajor = minorToMajor(lineDiscountMinor);

  // Draft paid qty before final pay unit (uses snapshot unit for inference).
  const draftUnitForPaid =
    unitPriceRaw > 0
      ? unitPriceRaw
      : listResolved != null && listResolved > 0
        ? listResolved
        : 0;
  const draftTotalForPaid =
    totalPrice != null ? totalPrice : draftUnitForPaid * quantity;
  const draftForPaid = {
    ...item,
    quantity,
    unitPrice: draftUnitForPaid,
    totalPrice: draftTotalForPaid,
    isConfirmedFreeReward,
    offer_quantity:
      item.offer_quantity ??
      item.offerQuantity ??
      item.free_quantity ??
      item.freeQuantity,
    free_quantity: item.free_quantity ?? item.freeQuantity,
    paid_quantity: item.paid_quantity ?? item.paidQuantity,
    ordered_quantity: item.ordered_quantity ?? item.orderedQuantity,
  };
  let paidQty = inferOrderLinePaidQuantity(draftForPaid);
  let freeQtyResolved = Math.max(0, quantity - paidQty);

  // Checkout often collapses same-SKU B1G1 into quantity=paid+free with no split.
  if (
    !isConfirmedFreeReward &&
    quantity > 0 &&
    paidQty >= quantity - 1e-9
  ) {
    const split = inferSameSkuBxgyPaidFree(quantity, {
      ...item,
      product: item.product,
      productId: item.product_id ?? item.productId,
      bundleRules: item.bundleRules ?? item.bundle_rules ?? item.product?.bundleRules,
    });
    if (split && split.free > 0 && split.paid > 0 && split.paid < quantity) {
      paidQty = split.paid;
      freeQtyResolved = split.free;
    }
  }

  const mixedPaidFree = paidQty > 0 && quantity > paidQty;
  const isBxgyPaidLine =
    !isConfirmedFreeReward &&
    (mixedPaidFree ||
      (paidQty > 0 &&
        Number(
          item.offer_quantity ??
            item.offerQuantity ??
            item.free_quantity ??
            item.freeQuantity,
        ) > 0));

  const offerUnit = resolveOrderLineOfferUnit(
    item,
    listResolved,
    paidQty > 0 ? paidQty : quantity,
    // For B1G1 collapsed lines, draft total is often list×display — don't treat
    // that as the discounted payable when deriving offer unit from line total.
    mixedPaidFree ? 0 : draftTotalForPaid,
  );

  const qtyPay = paidQty > 0 ? paidQty : quantity;
  const appliedCatalogOffer =
    !isConfirmedFreeReward &&
    offerUnit != null &&
    offerUnit > 0 &&
    listResolved != null &&
    listResolved > offerUnit + 0.009;

  // Pay unit: catalog offer when known and below list; else snapshot; else list.
  let unitPrice = appliedCatalogOffer
    ? offerUnit
    : offerUnit != null && offerUnit > 0
      ? offerUnit
      : unitPriceRaw > 0
        ? unitPriceRaw
        : listResolved != null && listResolved > 0
          ? listResolved
          : 0;

  let listPrice =
    listResolved != null && listResolved > unitPrice + 0.009
      ? listResolved
      : listPriceMinor > 0
        ? minorToMajor(listPriceMinor)
        : listResolved;

  // Catalog offer / B1G1: charge offer × paid only (free units ₹0).
  if (appliedCatalogOffer || (mixedPaidFree && unitPrice > 0)) {
    const payUnit = appliedCatalogOffer ? offerUnit : unitPrice;
    unitPrice = payUnit;
    totalPrice = payUnit * qtyPay;
  } else if (totalPrice == null) {
    totalPrice = unitPrice * qtyPay;
  } else if (
    !isConfirmedFreeReward &&
    paidQty > 0 &&
    totalPrice > 0.009 &&
    listPrice != null &&
    listPrice > 0 &&
    totalPrice < listPrice * paidQty - 0.009
  ) {
    // Explicit discounted line total below list — derive pay unit from it.
    unitPrice = totalPrice / paidQty;
  }

  const catalogGapMajor =
    appliedCatalogOffer && listPrice != null && listPrice > 0
      ? Math.max(0, listPrice * qtyPay - totalPrice)
      : 0;
  const effectiveLineDiscountMajor =
    catalogGapMajor > 0.009
      ? Math.max(lineDiscountMajor, catalogGapMajor)
      : lineDiscountMajor;

  const catalogPrice = Math.max(unitPrice, listPrice != null ? listPrice : 0);

  const isDeleted = isOrderLineUnavailable(item, {
    quantity,
    originalQuantity,
    lineTotalMinor,
    unitPriceMinor: unitPriceMinor > 0 ? unitPriceMinor : listPriceMinor,
    unitPrice,
    listPrice: listPrice != null ? listPrice : 0,
    listPriceMinor,
    totalPrice,
    lineDiscount: effectiveLineDiscountMajor,
    lineDiscountMinor,
    lineTotalExplicitZero:
      lineTotalExplicitZero || (totalPrice === 0 && catalogPrice > 0),
    isConfirmedFreeReward,
  });

  const { shopAdded, shopEdited } = detectShopLineEdit(item, {
    quantity,
    originalQuantity,
  });
  const shopQuantityAdjusted = shopEdited && !shopAdded;

  // BXGY: restore wiped unit to list for display, but never replace an already
  // discounted payable (sale on the paid line) with list × paid.
  let displayUnitPrice = unitPrice;
  const listTimesPaid =
    listPrice != null && listPrice > 0 && paidQty > 0
      ? listPrice * paidQty
      : null;
  const hasDiscountedPayable =
    listTimesPaid != null &&
    Number.isFinite(totalPrice) &&
    totalPrice > 0.009 &&
    totalPrice < listTimesPaid - 0.009;

  if (
    !isDeleted &&
    isBxgyPaidLine &&
    listPrice != null &&
    listPrice > 0 &&
    paidQty > 0
  ) {
    if (hasDiscountedPayable) {
      displayUnitPrice = totalPrice / paidQty;
    } else if (!(totalPrice > 0.009)) {
      displayUnitPrice = listPrice;
      totalPrice = listTimesPaid;
    } else {
      // Keep payable; surface list as unit only when unit was coupon-wiped below list
      // without an explicit sale gap (total already ≈ list×paid).
      displayUnitPrice = listPrice;
    }
  } else if (
    !isDeleted &&
    !isConfirmedFreeReward &&
    catalogPrice > 0 &&
    paidQty > 0 &&
    totalPrice < 0.009
  ) {
    // Rebuild payable total when API zeroed a still-active paid line incorrectly.
    const sellUnit =
      offerUnit != null && offerUnit > 0
        ? offerUnit
        : listPrice != null && listPrice > 0
          ? listPrice
          : catalogPrice;
    displayUnitPrice = sellUnit;
    totalPrice = sellUnit * paidQty;
  }

  const catalogSaleGap =
    listPrice != null &&
    listPrice > 0 &&
    displayUnitPrice > 0 &&
    listPrice > displayUnitPrice + 0.009 &&
    totalPrice > 0.009;

  const hasOffer =
    !isDeleted &&
    (isConfirmedFreeReward ||
      mixedPaidFree ||
      catalogSaleGap ||
      (effectiveLineDiscountMajor > 0.009 && totalPrice > 0.009));

  const { weight, unit } = resolveProductWeightAndUnit({
    unit_size: item.unit_size ?? item.unit_size_snapshot ?? item.unitSize,
    unit_size_snapshot: item.unit_size_snapshot,
    unit: item.unit_label_snapshot ?? item.unit ?? item.unitLabel,
    unit_label_snapshot: item.unit_label_snapshot,
    weight: item.weight,
    name: productName,
  });
  const packLabel = formatWeightUnitLabel(weight, unit);
  const unitSize = parseProductUnitSize(item);
  return {
    id: item.id,
    productId: item.product_id ?? item.productId,
    productSlug: item.product_slug ?? item.productSlug,
    productName,
    productSku: item.productSku ?? item.product_sku,
    unitLabel: item.unit_label_snapshot ?? item.unitLabel ?? unit ?? "",
    unitSize,
    weight,
    unit,
    packLabel,
    quantity,
    unitPrice: displayUnitPrice,
    listPrice,
    lineDiscountMinor,
    lineDiscount: effectiveLineDiscountMajor,
    totalPrice,
    appliedPromotionIds,
    hasOffer,
    isConfirmedFreeReward,
    isDeleted,
    originalQuantity,
    shopQuantityAdjusted,
    shopAdded,
    shopEdited,
    product: item.product || {},
    name: productName,
    image: resolveOrderItemImage(item),
    price: displayUnitPrice,
    discount: parseFloat(item.discount || 0),
    offer_quantity:
      freeQtyResolved > 0
        ? freeQtyResolved
        : item.offer_quantity ?? item.offerQuantity ?? null,
    free_quantity:
      freeQtyResolved > 0
        ? freeQtyResolved
        : item.free_quantity ?? item.freeQuantity ?? null,
    paid_quantity: paidQty,
    paidQuantity: paidQty,
    ordered_quantity: item.ordered_quantity ?? item.orderedQuantity ?? paidQty,
    isBxgyBuyLine: mixedPaidFree || isBxgyPaidLine,
    is_bxgy_buy_line: mixedPaidFree || isBxgyPaidLine,
    bundleRules:
      item.bundleRules ??
      item.bundle_rules ??
      item.product?.bundleRules ??
      item.product?.bundle_rules ??
      null,
    bundle_rules:
      item.bundle_rules ??
      item.bundleRules ??
      item.product?.bundle_rules ??
      item.product?.bundleRules ??
      null,
    bundleSourceCartItemId:
      item.bundle_source_cart_item_id ??
      item.bundleSourceCartItemId ??
      item.bundle_source_item_id ??
      item.bundleSourceItemId ??
      null,
    paidCartItemId:
      item.paid_cart_item_id ??
      item.paidCartItemId ??
      item.bundle_source_cart_item_id ??
      item.bundleSourceCartItemId ??
      null,
  };
}

function lineDedupeKey(raw) {
  if (!raw || typeof raw !== "object") return "";
  if (raw.id != null && String(raw.id).trim())
    return `id:${String(raw.id).trim()}`;
  const pid = raw.product_id ?? raw.productId;
  if (pid != null && String(pid).trim()) return `pid:${String(pid).trim()}`;
  const name =
    raw.product_name_snapshot ||
    raw.productName ||
    raw.product_name ||
    raw.name ||
    "";
  return name ? `name:${String(name).trim().toLowerCase()}` : "";
}

/**
 * Merge primary items with sibling unavailable/removed arrays from order payloads.
 */
function collectRawOrderItems(apiOrder, extraItems = []) {
  const primary = Array.isArray(apiOrder?.items) ? apiOrder.items : [];
  const siblings = [
    ...(Array.isArray(extraItems) ? extraItems : []),
    ...(Array.isArray(apiOrder?.unavailable_items)
      ? apiOrder.unavailable_items
      : []),
    ...(Array.isArray(apiOrder?.unavailableItems)
      ? apiOrder.unavailableItems
      : []),
    ...(Array.isArray(apiOrder?.removed_items) ? apiOrder.removed_items : []),
    ...(Array.isArray(apiOrder?.removedItems) ? apiOrder.removedItems : []),
    ...(Array.isArray(apiOrder?.rejected_items) ? apiOrder.rejected_items : []),
    ...(Array.isArray(apiOrder?.rejectedItems) ? apiOrder.rejectedItems : []),
  ];

  const primaryKeys = new Set(primary.map(lineDedupeKey).filter(Boolean));
  const out = [...primary];

  for (const raw of siblings) {
    if (!raw || typeof raw !== "object") continue;
    const key = lineDedupeKey(raw);
    const forced = { ...raw, is_deleted: true, unavailable: true };
    if (key && primaryKeys.has(key)) {
      const idx = out.findIndex((row) => lineDedupeKey(row) === key);
      if (idx >= 0) {
        out[idx] = { ...out[idx], ...forced };
      }
      continue;
    }
    if (key) primaryKeys.add(key);
    out.push(forced);
  }

  return out;
}

function mapOrderItems(apiOrder, extraItems = []) {
  const items = collectRawOrderItems(apiOrder, extraItems)
    .map(transformOrderItem)
    .filter(Boolean);

  const freePromoIds = new Set();
  for (const it of items) {
    if (!it || it.isDeleted) continue;
    const free =
      it.isConfirmedFreeReward === true ||
      (Number(it.paid_quantity ?? it.paidQuantity) <= 0 &&
        Number(it.totalPrice) < 0.01 &&
        Number(it.quantity) > 0);
    if (!free) continue;
    for (const id of it.appliedPromotionIds || []) {
      if (id) freePromoIds.add(String(id));
    }
  }
  if (!freePromoIds.size) return items;

  return items.map((it) => {
    if (!it || it.isDeleted || it.isConfirmedFreeReward) return it;
    const paid = Number(it.paid_quantity ?? it.paidQuantity);
    const qty = Number(it.quantity);
    if (!(paid > 0 && Math.abs(paid - qty) < 1e-6)) return it;
    const shares = (it.appliedPromotionIds || []).some((id) =>
      freePromoIds.has(String(id)),
    );
    if (!shares) return it;
    return { ...it, isBxgyBuyLine: true, is_bxgy_buy_line: true };
  });
}

/**
 * When picker drops line(s) from order totals but leaves unit×qty on the items,
 * mark the unique candidate subset whose prices sum to (lineSum − subtotal) as unavailable.
 * Includes offer-stamped paid lines (picker often leaves Offer applied on removed SKUs).
 * Confirmed free rewards are not used to explain a payable gap.
 * Handles multi-line removals (e.g. gap 390 = 175 + 215); skips if multiple subsets match.
 */
function markUnavailableExcludedFromSubtotal(items, subtotalMajor) {
  if (!Array.isArray(items) || !items.length) return items;
  const subtotal = Number(subtotalMajor);
  if (!Number.isFinite(subtotal)) return items;
  // Zero/negative subtotal is usually promo/API math (or rejected wipe), not a
  // picker removing a subset of lines — don't invent UNAVAILABLE from the gap.
  if (!(subtotal > 0.009)) return items;

  const sumAll = items.reduce(
    (acc, it) => acc + (Number(it.totalPrice) || 0),
    0,
  );
  if (Math.abs(sumAll - subtotal) < 0.02) return items;

  const gap = sumAll - subtotal;
  if (!(gap > 0.02)) return items;

  const candidates = items.filter(
    (it) =>
      !it.isDeleted &&
      !it.isConfirmedFreeReward &&
      Number(it.quantity) > 0 &&
      Number(it.unitPrice || it.price || 0) > 0 &&
      Number(it.totalPrice) > 0.009,
  );
  if (!candidates.length) return items;

  // Cap enumeration; storefront orders are small.
  const capped = candidates.slice(0, 12);
  const n = capped.length;
  /** @type {number[]|null} */
  let matchingIndices = null;
  let matchCount = 0;

  for (let mask = 1; mask < 1 << n; mask += 1) {
    let subsetSum = 0;
    for (let i = 0; i < n; i += 1) {
      if (mask & (1 << i)) subsetSum += Number(capped[i].totalPrice) || 0;
    }
    if (Math.abs(subsetSum - gap) < 0.02) {
      matchCount += 1;
      if (matchCount === 1) {
        matchingIndices = [];
        for (let i = 0; i < n; i += 1) {
          if (mask & (1 << i)) matchingIndices.push(i);
        }
      } else {
        // Ambiguous: more than one distinct subset explains the gap.
        return items;
      }
    }
  }

  if (!matchingIndices || !matchingIndices.length) return items;

  const removeIds = new Set();
  const removeRefs = new Set();
  for (const idx of matchingIndices) {
    const it = capped[idx];
    if (it?.id != null) removeIds.add(String(it.id));
    removeRefs.add(it);
  }

  return items.map((it) => {
    const hit =
      removeRefs.has(it) || (it?.id != null && removeIds.has(String(it.id)));
    if (!hit) return it;
    return { ...it, isDeleted: true, totalPrice: 0, hasOffer: false };
  });
}

/**
 * After picker removes paid line(s), mark free-reward ₹0 lines unavailable only when
 * their linked buy parent was removed — not merely because unrelated SKUs were dropped.
 */
function markZeroOfferLinesUnavailableAfterPicker(items, _orderStatus) {
  if (!Array.isArray(items) || !items.length) return items;

  const deletedParentIds = new Set();
  for (const it of items) {
    if (!it?.isDeleted) continue;
    if (it.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(it)) continue;
    if (it.id != null && String(it.id).trim()) {
      deletedParentIds.add(String(it.id).trim());
    }
  }
  if (!deletedParentIds.size) return items;

  return items.map((it) => {
    if (it?.isDeleted) return it;
    const isZeroConfirmedFree =
      Number(it.totalPrice) === 0 &&
      (it.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(it));
    if (!isZeroConfirmedFree) return it;

    const sourceId = getOrderFreeRewardParentId(it);
    if (sourceId && deletedParentIds.has(sourceId)) {
      return { ...it, isDeleted: true, hasOffer: false, totalPrice: 0 };
    }

    // Fallback: every paid buy line sharing this free line's promo ids is deleted.
    const freePromos = (it.appliedPromotionIds || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    if (!freePromos.length) return it;

    const buysForPromo = items.filter(
      (buy) =>
        buy &&
        buy.isConfirmedFreeReward !== true &&
        !isConfirmedFreeRewardLine(buy) &&
        (buy.appliedPromotionIds || []).some((id) =>
          freePromos.includes(String(id)),
        ),
    );
    if (!buysForPromo.length) return it;
    const allBuysDeleted = buysForPromo.every((buy) => buy.isDeleted);
    if (!allBuysDeleted) return it;

    return { ...it, isDeleted: true, hasOffer: false, totalPrice: 0 };
  });
}

function applyUnavailableLinePasses(items, subtotalMajor, orderStatus) {
  const afterSubtotal = markUnavailableExcludedFromSubtotal(
    items,
    subtotalMajor,
  );
  return markZeroOfferLinesUnavailableAfterPicker(afterSubtotal, orderStatus);
}

const FULFILLMENT_RANK = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 100,
};

/**
 * Map vendor/API fulfillment labels to our timeline + pill keys.
 * e.g. backend "accepted" / "ACKNOWLEDGED" should not fall through to pending styling.
 */
export function normalizeFulfillmentStatus(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!s) return "pending";

  const direct = {
    pending: "pending",
    placed: "pending",
    new: "pending",
    created: "pending",
    open: "pending",
    accepted: "confirmed",
    accept: "confirmed",
    approved: "confirmed",
    acknowledged: "confirmed",
    acknowledgement: "confirmed",
    order_confirmed: "confirmed",
    confirmed: "confirmed",
    confirm: "confirmed",
    assigned: "confirmed",
    assigned_to_picker: "confirmed",
    picker_assigned: "confirmed",
    ready_for_picker: "confirmed",
    processing: "processing",
    in_progress: "processing",
    inprogress: "processing",
    packing: "processing",
    preparing: "processing",
    packed: "processing",
    picking: "processing",
    picker: "processing",
    in_picking: "processing",
    pick_in_progress: "processing",
    allocated: "processing",
    ready_to_pack: "processing",
    ready: "processing",
    item_ready: "processing",
    items_ready: "processing",
    picked: "processing",
    partially_picked: "processing",
    partial: "processing",
    partial_pick: "processing",
    picking_complete: "processing",
    pick_complete: "processing",
    ready_for_dispatch: "processing",
    shipped: "shipped",
    ship: "shipped",
    dispatched: "shipped",
    out_for_delivery: "shipped",
    outfordelivery: "shipped",
    delivering: "shipped",
    in_transit: "shipped",
    intransit: "shipped",
    delivered: "delivered",
    delivery: "delivered",
    completed: "delivered",
    complete: "delivered",
    cancelled: "cancelled",
    canceled: "cancelled",
    rejected: "cancelled",
    reject: "cancelled",
    declined: "cancelled",
    shop_rejected: "cancelled",
    rejected_by_shop: "cancelled",
    rejected_by_admin: "cancelled",
    refused: "cancelled",
  };
  if (direct[s]) return direct[s];
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("reject") || s.includes("declin") || s.includes("refus"))
    return "cancelled";
  if (s.includes("deliver") && (s.includes("ed") || s.endsWith("ed")))
    return "delivered";
  if (
    s.includes("deliver") ||
    s.includes("ship") ||
    s.includes("dispatch") ||
    s.includes("transit")
  )
    return "shipped";
  if (
    s.includes("process") ||
    s.includes("pack") ||
    s.includes("pick") ||
    s.includes("allocat") ||
    s.includes("ready")
  ) {
    return "processing";
  }
  if (
    s.includes("accept") ||
    s.includes("confirm") ||
    s.includes("approv") ||
    s.includes("assign")
  ) {
    return "confirmed";
  }
  return "pending";
}

/** Prefer the furthest fulfillment stage when APIs split status across fields. */
export function pickFurthestFulfillmentStatus(rawCandidates) {
  const list = Array.isArray(rawCandidates) ? rawCandidates : [rawCandidates];
  let best = "pending";
  let bestRank = FULFILLMENT_RANK.pending;
  for (const raw of list) {
    if (raw == null || raw === "") continue;
    const normalized = normalizeFulfillmentStatus(raw);
    const rank = FULFILLMENT_RANK[normalized] ?? 0;
    if (normalized === "cancelled") return "cancelled";
    if (rank > bestRank) {
      best = normalized;
      bestRank = rank;
    }
  }
  return best;
}

function tryParseJsonObject(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function asAddressRecord(value) {
  if (value == null || value === "") return null;
  const fromJson = tryParseJsonObject(value);
  if (fromJson) return fromJson;
  if (typeof value === "string" && value.trim()) {
    return { street: value.trim(), address: value.trim() };
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const nested =
    (value.address && typeof value.address === "object" && value.address) ||
    (value.deliveryAddress &&
      typeof value.deliveryAddress === "object" &&
      value.deliveryAddress) ||
    (value.delivery_address &&
      typeof value.delivery_address === "object" &&
      value.delivery_address) ||
    (value.location &&
      typeof value.location === "object" &&
      (value.location.line1 || value.location.city || value.location.street) &&
      value.location) ||
    null;
  if (nested && Object.keys(nested).length) return nested;
  return Object.keys(value).length ? value : null;
}

/**
 * Normalize delivery address from common storefront / snapshot field shapes.
 */
function normalizeDeliveryAddress(apiOrder) {
  if (!apiOrder || typeof apiOrder !== "object") return {};

  const customer =
    apiOrder.customer && typeof apiOrder.customer === "object"
      ? apiOrder.customer
      : null;
  const user =
    apiOrder.user && typeof apiOrder.user === "object" ? apiOrder.user : null;
  const meta =
    (apiOrder.meta && typeof apiOrder.meta === "object" && apiOrder.meta) ||
    (apiOrder.metadata &&
      typeof apiOrder.metadata === "object" &&
      apiOrder.metadata) ||
    null;

  const candidates = [
    apiOrder.deliveryAddress,
    apiOrder.delivery_address,
    apiOrder.shippingAddress,
    apiOrder.shipping_address,
    apiOrder.delivery_address_snapshot,
    apiOrder.deliveryAddressSnapshot,
    apiOrder.address_snapshot,
    apiOrder.addressSnapshot,
    apiOrder.customer_address,
    apiOrder.customerAddress,
    apiOrder.shipping_address_snapshot,
    apiOrder.shippingAddressSnapshot,
    apiOrder.address,
    apiOrder.drop_location,
    apiOrder.dropLocation,
    apiOrder.fulfillment_address,
    apiOrder.fulfillmentAddress,
    customer?.address,
    customer?.deliveryAddress,
    customer?.delivery_address,
    user?.address,
    user?.deliveryAddress,
    meta?.deliveryAddress,
    meta?.delivery_address,
    meta?.address,
  ];

  let raw = null;
  let stringFallback = null;
  for (const c of candidates) {
    const record = asAddressRecord(c);
    if (!record) continue;
    const keys = Object.keys(record);
    const looksLikePlainString =
      typeof c === "string" &&
      !tryParseJsonObject(c) &&
      keys.every((k) => k === "street" || k === "address");
    if (looksLikePlainString) {
      if (!stringFallback) stringFallback = record;
      continue;
    }
    raw = record;
    break;
  }
  if (!raw) raw = stringFallback;

  const pick = (...keys) => {
    for (const k of keys) {
      const v = raw?.[k] ?? apiOrder?.[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  const street =
    pick(
      "street",
      "address",
      "line1",
      "address_line1",
      "addressLine1",
      "address_line_1",
      "full_address",
      "fullAddress",
      "formatted_address",
      "formattedAddress",
      "display_address",
      "displayAddress",
      "building",
      "apartment",
      "house",
    ) || "";
  const line2 = pick(
    "line2",
    "address_line2",
    "addressLine2",
    "address_line_2",
    "landmark",
  );
  const fullName = pick(
    "fullName",
    "full_name",
    "name",
    "recipient_name",
    "recipientName",
    "customer_name",
    "customerName",
  );
  const city = pick("city", "town", "district", "area", "locality");
  const phone = pick("phone", "mobile", "contact_phone", "contactPhone");
  const area = pick("area", "locality", "suburb");
  const landmark = pick("landmark", "nearby", "near");

  if (
    !street &&
    !fullName &&
    !city &&
    !phone &&
    !area &&
    !landmark &&
    !raw
  ) {
    return {};
  }

  const {
    state: _state,
    zipCode: _zipCode,
    postalCode: _postalCode,
    country: _country,
    ...rawRest
  } = raw && typeof raw === "object" ? raw : {};

  return {
    ...rawRest,
    fullName: fullName || raw?.fullName || raw?.name || "",
    name: fullName || raw?.name || raw?.fullName || "",
    street: street || raw?.street || "",
    address: street || raw?.address || street,
    line1: street || raw?.line1 || "",
    line2: line2 || raw?.line2 || "",
    city: city || raw?.city || area || "",
    area: area || raw?.area || "",
    phone: phone || raw?.phone || "",
    landmark: landmark || raw?.landmark || "",
  };
}

export function hasOrderDisplayAddress(addr) {
  if (!addr || typeof addr !== "object") return false;
  return [
    "fullName",
    "name",
    "street",
    "address",
    "line1",
    "line2",
    "city",
    "area",
    "phone",
    "landmark",
    "formattedAddress",
  ].some((key) => String(addr[key] || "").trim());
}

export function savedAddressToOrderAddress(saved) {
  if (!saved || typeof saved !== "object") return {};
  const line1 = String(saved.line1 || saved.street || saved.address || "").trim();
  const line2 = String(saved.line2 || "").trim();
  const street = [line1, line2].filter(Boolean).join(", ");
  return {
    fullName: String(saved.fullName || saved.name || "").trim(),
    name: String(saved.fullName || saved.name || "").trim(),
    street,
    address: street || line1,
    line1,
    line2,
    city: String(saved.city || saved.area || "").trim(),
    area: String(saved.area || "").trim(),
    phone: String(saved.phone || "").trim(),
    landmark: String(saved.landmark || "").trim(),
  };
}

/**
 * Payable sum for Price summary / Items header (excludes removed + confirmed free rewards).
 */
function sumActiveOrderLinePayables(items) {
  return (items || [])
    .filter((it) => !it?.isDeleted && !it?.isConfirmedFreeReward)
    .reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
}

/**
 * When order snapshots omit a real catalog offer (pay < list) or bundleRules,
 * merge live product pricing onto raw lines. Snapshot "offer" equal to list
 * (215/180) must not block enrich — that left customers paying list on details.
 */
async function enrichOrderRawItemsWithCatalogOffers(rawItems) {
  const list = Array.isArray(rawItems) ? rawItems.filter(Boolean) : [];
  if (!list.length) return list;

  const hasBundleRules = (raw) => {
    const rules =
      raw.bundleRules ??
      raw.bundle_rules ??
      raw.product?.bundleRules ??
      raw.product?.bundle_rules;
    return Array.isArray(rules) && rules.length > 0;
  };

  const needsEnrich = (raw) => {
    if (isConfirmedFreeRewardLine(raw)) return false;
    const pid = raw.product_id ?? raw.productId ?? raw.product?.id;
    if (pid == null || String(pid).trim() === "") return false;
    return !hasMeaningfulCatalogOfferOnRaw(raw) || !hasBundleRules(raw);
  };

  const ids = [
    ...new Set(
      list
        .filter(needsEnrich)
        .map((raw) =>
          String(raw.product_id ?? raw.productId ?? raw.product?.id).trim(),
        )
        .filter(Boolean),
    ),
  ];
  if (!ids.length) return list;

  const fetched = await Promise.all(
    ids.map(async (id) => {
      const product = await getProductById(id, { silent: true });
      return [id, product];
    }),
  );
  const byId = new Map();
  for (const [id, p] of fetched) {
    if (!p) continue;
    if (p.id != null && !orderProductIdsMatch(id, p.id)) continue;
    byId.set(String(id).trim().toLowerCase(), p);
  }

  return list.map((raw) => {
    if (!needsEnrich(raw)) return raw;
    const pid = String(
      raw.product_id ?? raw.productId ?? raw.product?.id,
    ).trim();
    const product = byId.get(pid.toLowerCase());
    if (!product) return raw;
    if (product.id != null && !orderProductIdsMatch(pid, product.id)) {
      return raw;
    }

    const priced = resolveCatalogListAndPay(
      {
        ...product,
        product,
        offerPrice: product.offerPrice ?? product.offerPriceEffective,
        listPrice:
          product.originalPrice ??
          product.listPrice ??
          product.mrp ??
          product.price,
      },
      { trustProduct: true },
    );
    const listUnit = priced.listUnit;
    const offer = priced.payUnit;
    const bundleRules =
      product.bundleRules ?? product.bundle_rules ?? null;
    const hasOfferBelowList = priced.hasOffer;

    const prevProduct =
      raw.product && typeof raw.product === "object" ? raw.product : {};
    const lineHasImage = Boolean(
      firstImageUrl(raw.product_image_snapshot) ||
        firstImageUrl(raw.productImage) ||
        firstImageUrl(raw.product_image) ||
        firstImageUrl(raw.image_url) ||
        firstImageUrl(raw.imageUrl) ||
        firstImageUrl(raw.thumbnail_url) ||
        firstImageUrl(raw.thumbnailUrl) ||
        (typeof raw.image === "string" && firstImageUrl(raw.image)),
    );

    const offerMinor = hasOfferBelowList ? Math.round(offer * 100) : null;
    const listMinor =
      listUnit != null && listUnit > 0 ? Math.round(listUnit * 100) : null;

    const nextProduct = {
      ...prevProduct,
      id: product.id ?? pid,
      ...(hasOfferBelowList
        ? {
            offerPrice: offer,
            offerPriceEffective: offer,
            finalPriceMinor: offerMinor,
            price: listUnit ?? product.price,
            listPrice: listUnit ?? product.listPrice,
            originalPrice: listUnit ?? product.originalPrice,
            mrp: product.mrp ?? listUnit,
            actualPriceMinor: listMinor ?? product.actualPriceMinor,
          }
        : {}),
      ...(Array.isArray(bundleRules) && bundleRules.length
        ? { bundleRules, bundle_rules: bundleRules }
        : {}),
    };
    if (lineHasImage) {
      delete nextProduct.image;
      delete nextProduct.imageUrl;
      delete nextProduct.image_url;
      delete nextProduct.images;
      delete nextProduct.thumbnail;
      delete nextProduct.thumbnailUrl;
    }

    return {
      ...raw,
      ...(hasOfferBelowList
        ? {
            offerPrice: offer,
            offerPriceEffective: offer,
            offer_price_minor_per_unit: offerMinor,
            offerPriceMinorPerUnit: offerMinor,
            final_price_minor: offerMinor,
            finalPriceMinor: offerMinor,
            ...(listMinor != null
              ? {
                  list_price_minor: listMinor,
                  listPriceMinor: listMinor,
                  listPrice: listUnit,
                  originalPrice: listUnit,
                }
              : {}),
          }
        : {}),
      ...(Array.isArray(bundleRules) && bundleRules.length
        ? { bundleRules, bundle_rules: bundleRules }
        : {}),
      product: nextProduct,
    };
  });
}

/**
 * Align order subtotal/total with line payables.
 * Preserves API total−subtotal gap (order-level coupon / delivery / tax delta).
 */
function reconcileOrderMoneyFromActiveLines(subtotal, total, activeSum) {
  if (!(activeSum > 0.009)) {
    return {
      subtotal: Number(subtotal) || 0,
      total: Number(total) || 0,
    };
  }
  const prevSub = Number(subtotal) || 0;
  const prevTot = Number(total) || 0;
  const gap = prevTot - prevSub;
  const nextSub = activeSum;
  const nextTot =
    Math.abs(gap) > 0.009 ? Math.max(0, activeSum + gap) : activeSum;
  return { subtotal: nextSub, total: nextTot };
}

function sumLineOfferSavingsMajor(items) {
  return (items || []).reduce((sum, it) => {
    if (!it || it.isDeleted) return sum;
    return sum + (getOrderLineOfferSavingsMajor(it) || 0);
  }, 0);
}

function normalizeBxgyPaidLineCatalog(items) {
  const list = Array.isArray(items) ? items : [];
  if (!orderHasBxgyOffer(list)) return list;
  return list.map((it) => {
    if (!it || it.isDeleted || it.isConfirmedFreeReward) return it;
    const listPrice = Number(it.listPrice);
    if (!(listPrice > 0)) return it;
    const paidQty = inferOrderLinePaidQuantity(it);
    if (!(paidQty > 0)) return it;
    const listTimesPaid = listPrice * paidQty;
    const currentTotal = Number(it.totalPrice);
    const unit = Number(it.unitPrice);
    const hasDiscountedPayable =
      Number.isFinite(currentTotal) &&
      currentTotal > 0.009 &&
      currentTotal < listTimesPaid - 0.009;

    // Keep catalog offer / discounted payable — never force unit/total up to list
    // (that wiped offer pay and inflated totals to list×paid).
    if (hasDiscountedPayable) {
      const payUnit = currentTotal / paidQty;
      return {
        ...it,
        unitPrice: payUnit,
        price: payUnit,
        totalPrice: currentTotal,
      };
    }
    if (
      Number.isFinite(unit) &&
      unit > 0 &&
      unit < listPrice - 0.009
    ) {
      return {
        ...it,
        unitPrice: unit,
        price: unit,
        totalPrice:
          Number.isFinite(currentTotal) && currentTotal > 0.009
            ? currentTotal
            : unit * paidQty,
      };
    }
    return it;
  });
}

/**
 * Transform API order to frontend format
 */
function transformOrder(apiOrder) {
  if (!apiOrder) return null;

  const status = pickFurthestFulfillmentStatus([
    apiOrder.status,
    apiOrder.order_status,
    apiOrder.orderStatus,
    apiOrder.fulfillment_status,
    apiOrder.fulfillmentStatus,
    apiOrder.state,
  ]);
  const methodRaw = apiOrder.paymentMethod || apiOrder.payment_method || "cod";
  const paymentStatusRaw =
    apiOrder.paymentStatus || apiOrder.payment_status || "";
  const promotionDiscountMinor = parseMinorInt(
    apiOrder.promotion_discount_total_minor ??
      apiOrder.promotionDiscountTotalMinor,
  );
  const couponCode =
    apiOrder.coupon_code_normalized ??
    apiOrder.couponCode ??
    apiOrder.coupon_code ??
    null;
  const appliedPromotionIds = Array.isArray(apiOrder.applied_promotion_ids)
    ? apiOrder.applied_promotion_ids
    : Array.isArray(apiOrder.appliedPromotionIds)
      ? apiOrder.appliedPromotionIds
      : [];
  const couponDiscountMinor = parseMinorInt(
    apiOrder.coupon_discount_minor ?? apiOrder.couponDiscountMinor,
  );
  const autoPromotionDiscountMinor = parseMinorInt(
    apiOrder.auto_promotion_discount_minor ??
      apiOrder.autoPromotionDiscountMinor,
  );
  const couponCodesRaw =
    apiOrder.coupon_codes_normalized ?? apiOrder.couponCodesNormalized ?? null;
  const couponCodes = Array.isArray(couponCodesRaw)
    ? couponCodesRaw
        .map((c) =>
          String(c || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean)
    : [];
  const mappedItems = mapOrderItems(apiOrder);
  const promotionDiscountMajor = minorToMajor(promotionDiscountMinor);
  let subtotal =
    apiOrder.subtotal_minor != null
      ? minorToMajor(apiOrder.subtotal_minor)
      : parseFloat(apiOrder.subtotal || 0);
  const itemsRaw = applyUnavailableLinePasses(mappedItems, subtotal, status);

  // Coupons must not stack with BXGY. Normalize paid-line catalog when BXGY
  // is present, but keep discounted line payables (sale on paid lines).
  const hasBxgy = orderHasBxgyOffer(itemsRaw);
  const items = normalizeBxgyPaidLineCatalog(itemsRaw);

  // When reject/promo wipe zeroes order-level money but lines still have payable
  // totals (Items header), reconcile so Price summary matches Items.
  const activeSum = sumActiveOrderLinePayables(items);

  // Coupons must not stack with BXGY — drop coupon ledger and use line payables.
  let resolvedCouponCode = couponCode ? String(couponCode).trim() : null;
  let resolvedDiscount =
    promotionDiscountMajor > 0
      ? promotionDiscountMajor
      : parseFloat(apiOrder.discount || 0);
  let resolvedPromoMinor = promotionDiscountMinor;
  let resolvedPromoMajor = promotionDiscountMajor;
  let resolvedCouponDiscountMinor = couponDiscountMinor;
  let resolvedAutoPromoMinor = autoPromotionDiscountMinor;
  let resolvedCouponCodes = couponCodes;
  if (hasBxgy) {
    resolvedCouponCode = null;
    resolvedDiscount = 0;
    resolvedPromoMinor = 0;
    resolvedPromoMajor = 0;
    resolvedCouponDiscountMinor = 0;
    resolvedAutoPromoMinor = 0;
    resolvedCouponCodes = [];
  }

  let total =
    apiOrder.total_minor != null
      ? minorToMajor(apiOrder.total_minor)
      : parseFloat(apiOrder.total || 0);
  ({ subtotal, total } = reconcileOrderMoneyFromActiveLines(
    subtotal,
    total,
    activeSum,
  ));

  // Prefer catalog line savings over stale API auto-promo (e.g. ₹54 vs list−offer).
  if (!hasBxgy) {
    const lineSavings = sumLineOfferSavingsMajor(items);
    if (lineSavings > minorToMajor(resolvedAutoPromoMinor) + 0.009) {
      resolvedAutoPromoMinor = Math.round(lineSavings * 100);
      if (!(resolvedPromoMajor > lineSavings + 0.009)) {
        resolvedPromoMinor = resolvedAutoPromoMinor + resolvedCouponDiscountMinor;
        resolvedPromoMajor = minorToMajor(resolvedPromoMinor);
      }
      if (!(resolvedDiscount > lineSavings + 0.009)) {
        resolvedDiscount = lineSavings + minorToMajor(resolvedCouponDiscountMinor);
      }
    }
  }

  // Ensure Total includes tax + shipping when API total was only a list-priced subtotal.
  const taxMajor = parseFloat(apiOrder.tax || 0) || 0;
  const shippingMajor =
    apiOrder.delivery_fee_minor != null
      ? minorToMajor(apiOrder.delivery_fee_minor)
      : parseFloat(apiOrder.shipping || 0) || 0;
  const withExtras = subtotal + taxMajor + shippingMajor;
  if (
    withExtras > total + 0.009 &&
    Math.abs(total - subtotal) < 0.05
  ) {
    total = withExtras;
  }

  return {
    id: apiOrder.id,
    // Storefront fields (snake_case)
    orderNumber: apiOrder.orderNumber || apiOrder.order_number || "",
    status,
    paymentMethod: methodRaw,
    paymentStatus: (() => {
      if (paymentStatusRaw) return String(paymentStatusRaw).trim();
      const m = String(methodRaw || "").toLowerCase();
      if (m === "cod" || m === "cash_on_delivery") return "cod";
      return "pending";
    })(),
    paymentId: apiOrder.paymentId || null,
    subtotal,
    tax: parseFloat(apiOrder.tax || 0),
    shipping:
      apiOrder.delivery_fee_minor != null
        ? minorToMajor(apiOrder.delivery_fee_minor)
        : parseFloat(apiOrder.shipping || 0),
    discount: resolvedDiscount,
    total,
    promotionDiscountMinor: resolvedPromoMinor,
    promotionDiscountMajor: resolvedPromoMajor,
    couponDiscountMinor: resolvedCouponDiscountMinor,
    couponDiscountMajor: minorToMajor(resolvedCouponDiscountMinor),
    autoPromotionDiscountMinor: resolvedAutoPromoMinor,
    autoPromotionDiscountMajor: minorToMajor(resolvedAutoPromoMinor),
    couponCode: resolvedCouponCode,
    couponCodes: resolvedCouponCodes,
    appliedPromotionIds,
    deliveryTrackingUrl:
      (typeof apiOrder.deliveryTrackingUrl === "string" &&
        apiOrder.deliveryTrackingUrl.trim()) ||
      (typeof apiOrder.delivery_tracking_url === "string" &&
        apiOrder.delivery_tracking_url.trim()) ||
      null,
    yadroOrderId:
      apiOrder.yadroOrderId != null
        ? String(apiOrder.yadroOrderId)
        : apiOrder.yadro_order_id != null
          ? String(apiOrder.yadro_order_id)
          : null,
    offerId: apiOrder.offerId || null,
    offerCode: apiOrder.offerCode || resolvedCouponCode || null,
    offerDetails: apiOrder.offerDetails || null,
    deliveryAddress: normalizeDeliveryAddress(apiOrder),
    notes: apiOrder.notes || null,
    cancelledAt:
      apiOrder.cancelledAt ||
      apiOrder.cancelled_at ||
      apiOrder.rejectedAt ||
      apiOrder.rejected_at ||
      null,
    cancelledReason: (() => {
      const raw =
        apiOrder.cancelledReason ||
        apiOrder.cancelled_reason ||
        apiOrder.rejectedReason ||
        apiOrder.rejected_reason ||
        apiOrder.rejection_reason ||
        apiOrder.cancel_reason ||
        apiOrder.cancelReason ||
        "";
      const text = String(raw).trim();
      return text || null;
    })(),
    looksRejected: [
      apiOrder.status,
      apiOrder.order_status,
      apiOrder.orderStatus,
      apiOrder.fulfillment_status,
      apiOrder.fulfillmentStatus,
      apiOrder.state,
      apiOrder.cancelledReason,
      apiOrder.cancelled_reason,
      apiOrder.rejectedReason,
      apiOrder.rejected_reason,
      apiOrder.rejection_reason,
      apiOrder.cancel_reason,
      apiOrder.cancelReason,
    ].some((v) => /reject/i.test(String(v || ""))),
    deliveredAt: apiOrder.deliveredAt || apiOrder.delivered_at || null,
    shippedAt:
      apiOrder.shippedAt ||
      apiOrder.shipped_at ||
      apiOrder.out_for_delivery_at ||
      apiOrder.outForDeliveryAt ||
      null,
    itemCount:
      Number(
        apiOrder.itemCount ??
          apiOrder.item_count ??
          apiOrder.itemsCount ??
          apiOrder.items_count ??
          apiOrder.total_items ??
          apiOrder.totalItems ??
          items.length,
      ) || items.length,
    items,
    createdAt:
      apiOrder.createdAt || apiOrder.created_at || apiOrder.placed_at || "",
    updatedAt: apiOrder.updatedAt || apiOrder.updated_at || "",
    // Storefront API doesn't expose cancel/modify endpoints in current docs
    canCancel: false,
    canModify: false,
  };
}

/**
 * Create order from cart
 * @param {object} orderData - Order data
 * @returns {Promise<{order: object, payment: object}>}
 */
export async function createOrder(orderData) {
  throw new Error(
    "createOrder is not supported. Use POST /storefront/checkout instead.",
  );
}

/**
 * Verify payment after Razorpay payment
 * @param {string} orderId - Order ID
 * @param {object} paymentData - Payment response from Razorpay
 * @returns {Promise<object>}
 */
export async function verifyPayment(orderId, paymentData) {
  throw new Error(
    "Payment verification is not supported by this storefront API.",
  );
}

/**
 * Enrich catalog offers, normalize BXGY lines, and reconcile subtotal/total
 * so list + detail share the same payable money.
 * @param {object|null} apiOrderOrMerged
 * @param {array} [extraUnavailableItems]
 * @returns {Promise<object|null>}
 */
async function finalizeStorefrontOrder(
  apiOrderOrMerged,
  extraUnavailableItems = [],
) {
  if (!apiOrderOrMerged || typeof apiOrderOrMerged !== "object") return null;

  const rawItems = Array.isArray(apiOrderOrMerged.items)
    ? apiOrderOrMerged.items
    : [];
  const enrichedItems = await enrichOrderRawItemsWithCatalogOffers(rawItems);
  const enrichedUnavailable = await enrichOrderRawItemsWithCatalogOffers(
    Array.isArray(extraUnavailableItems) ? extraUnavailableItems : [],
  );

  const mergedSource = {
    ...apiOrderOrMerged,
    items: enrichedItems.length ? enrichedItems : apiOrderOrMerged.items,
  };

  const order = transformOrder(mergedSource);
  if (!order) return null;

  let remapped = applyUnavailableLinePasses(
    mapOrderItems(mergedSource || {}, enrichedUnavailable),
    order.subtotal,
    order.status,
  );
  remapped = normalizeBxgyPaidLineCatalog(remapped);
  order.items = remapped;
  order.itemCount = remapped.length;
  const hasBxgy = orderHasBxgyOffer(remapped);
  if (hasBxgy) {
    order.couponCode = null;
    order.couponCodes = [];
    order.discount = 0;
    order.promotionDiscountMinor = 0;
    order.promotionDiscountMajor = 0;
    order.couponDiscountMinor = 0;
    order.couponDiscountMajor = 0;
    order.autoPromotionDiscountMinor = 0;
    order.autoPromotionDiscountMajor = 0;
  }
  const money = reconcileOrderMoneyFromActiveLines(
    order.subtotal,
    order.total,
    sumActiveOrderLinePayables(remapped),
  );
  order.subtotal = money.subtotal;
  order.total = money.total;
  if (!hasBxgy) {
    const lineSavings = sumLineOfferSavingsMajor(remapped);
    if (
      lineSavings > Number(order.autoPromotionDiscountMajor || 0) + 0.009
    ) {
      order.autoPromotionDiscountMajor = lineSavings;
      order.autoPromotionDiscountMinor = Math.round(lineSavings * 100);
    }
  }
  return order;
}

/**
 * Get orders for current user. API supports `limit` only (1–100), newest first.
 * @param {object} params
 * @returns {Promise<{orders: array, pagination: object}>}
 */
export async function listOrders(params = {}) {
  try {
    const shopId = await resolveShopId();
    if (!shopId)
      throw new Error(
        "Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders).",
      );

    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(params.limit ?? params.per_page) || 50)),
    );

    const response = await apiFetchRoot("/storefront/orders", {
      method: "GET",
      headers: { "x-shop-id": shopId },
      omitTenantHeader: true,
      cache: "no-store",
      query: { limit },
    });

    const orders = (
      await Promise.all(
        (response?.orders || []).map((o) => finalizeStorefrontOrder(o)),
      )
    ).filter(Boolean);

    return {
      orders,
      pagination: {
        page: 1,
        per_page: limit,
        total: orders.length,
        total_pages: 1,
      },
    };
  } catch (error) {
    console.error("Error listing orders:", error);
    throw error;
  }
}

/**
 * Get order details by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<object>}
 */
export async function getOrder(orderId) {
  try {
    const shopId = await resolveShopId();
    if (!shopId)
      throw new Error(
        "Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders/:id).",
      );

    const response = await apiFetchRoot(
      `/storefront/orders/${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        headers: { "x-shop-id": shopId },
        omitTenantHeader: true,
        cache: "no-store",
      },
    );

    const apiOrder = response?.order || null;
    const topLevelItems = Array.isArray(response?.items) ? response.items : [];
    const topLevelAddress =
      response?.deliveryAddress ||
      response?.delivery_address ||
      response?.shippingAddress ||
      response?.shipping_address ||
      response?.address_snapshot ||
      response?.addressSnapshot ||
      response?.address ||
      null;
    const topLevelUnavailable = [
      ...(Array.isArray(response?.unavailable_items)
        ? response.unavailable_items
        : []),
      ...(Array.isArray(response?.unavailableItems)
        ? response.unavailableItems
        : []),
      ...(Array.isArray(response?.removed_items) ? response.removed_items : []),
      ...(Array.isArray(response?.removedItems) ? response.removedItems : []),
      ...(Array.isArray(response?.rejected_items)
        ? response.rejected_items
        : []),
      ...(Array.isArray(response?.rejectedItems) ? response.rejectedItems : []),
    ];

    const rawItems = topLevelItems.length
      ? topLevelItems
      : Array.isArray(apiOrder?.items)
        ? apiOrder.items
        : Array.isArray(response?.items)
          ? response.items
          : [];

    const mergedSource = apiOrder
      ? {
          ...response,
          ...apiOrder,
          items: rawItems,
          deliveryAddress:
            asAddressRecord(apiOrder.deliveryAddress) ||
            asAddressRecord(apiOrder.delivery_address) ||
            asAddressRecord(topLevelAddress) ||
            asAddressRecord(apiOrder.address) ||
            apiOrder.deliveryAddress,
        }
      : response && typeof response === "object"
        ? { ...response, items: rawItems }
        : null;

    return finalizeStorefrontOrder(mergedSource, topLevelUnavailable);
  } catch (error) {
    console.error("Error getting order:", error);
    throw error;
  }
}

/**
 * Cancel an order
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<object>}
 */
export async function cancelOrder(orderId, reason) {
  throw new Error("Cancel order is not supported by this storefront API.");
}

/**
 * Retry payment for an order
 * @param {string} orderId - Order ID
 * @param {string} paymentMethod - Optional payment method (upi, card, etc.)
 * @returns {Promise<{order: object, payment: object}>}
 */
export async function retryPayment(orderId, paymentMethod = null) {
  throw new Error("Retry payment is not supported by this storefront API.");
}
