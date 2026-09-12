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
  orderHasBxgyOffer,
  detectShopLineEdit,
} from "./orderPromotions";
import {
  formatWeightUnitLabel,
  parseProductUnitSize,
  resolveProductWeightAndUnit,
} from "./productUtils";

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
    "/images/dummy.png"
  );
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
  const listPrice = listPriceMinor > 0 ? minorToMajor(listPriceMinor) : null;
  // When API zeroes unit but leaves list (common after picker / BXGY wipe), use list as catalog.
  const unitPrice =
    unitPriceRaw > 0
      ? unitPriceRaw
      : listPrice != null && listPrice > 0
        ? listPrice
        : 0;

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
    totalPrice = unitPrice * quantity;
  }

  const originalQuantity = (() => {
    const raw =
      item.originalQuantity ??
      item.original_quantity ??
      item.orderedQuantity ??
      item.ordered_quantity ??
      item.placedQuantity ??
      item.placed_quantity ??
      item.requestedQuantity ??
      item.requested_quantity ??
      null;
    if (raw == null || raw === "") return null;
    const n = parseFloat(String(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const isConfirmedFreeReward = isConfirmedFreeRewardLine(item);
  const catalogPrice = Math.max(unitPrice, listPrice != null ? listPrice : 0);
  const lineDiscountMajor = minorToMajor(lineDiscountMinor);

  const isDeleted = isOrderLineUnavailable(item, {
    quantity,
    originalQuantity,
    lineTotalMinor,
    unitPriceMinor: unitPriceMinor > 0 ? unitPriceMinor : listPriceMinor,
    unitPrice,
    listPrice: listPrice != null ? listPrice : 0,
    listPriceMinor,
    totalPrice,
    lineDiscount: lineDiscountMajor,
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

  const draftForPaid = {
    ...item,
    quantity,
    unitPrice,
    totalPrice,
    isConfirmedFreeReward,
    offer_quantity: item.offer_quantity ?? item.offerQuantity,
    free_quantity: item.free_quantity ?? item.freeQuantity,
  };
  const paidQty = inferOrderLinePaidQuantity(draftForPaid);
  const mixedPaidFree = paidQty > 0 && quantity > paidQty;
  const isBxgyPaidLine = !isConfirmedFreeReward && (mixedPaidFree || paidQty > 0 && (
    Number(item.offer_quantity ?? item.offerQuantity ?? item.free_quantity ?? item.freeQuantity) > 0
  ));

  // Buy X Get Y never stacks with coupons. Prefer list/catalog × paid qty so a
  // coupon-wiped unit_price (e.g. ₹40) cannot replace the product price (₹60).
  let displayUnitPrice = unitPrice;
  if (!isDeleted && isBxgyPaidLine && listPrice != null && listPrice > 0 && paidQty > 0) {
    displayUnitPrice = listPrice;
    totalPrice = listPrice * paidQty;
  } else if (
    !isDeleted &&
    !isConfirmedFreeReward &&
    catalogPrice > 0 &&
    paidQty > 0 &&
    totalPrice < 0.009
  ) {
    // Rebuild payable total when API zeroed a still-active paid line incorrectly.
    const sellUnit = listPrice != null && listPrice > 0 ? listPrice : catalogPrice;
    displayUnitPrice = sellUnit;
    totalPrice = sellUnit * paidQty;
  }

  const hasOffer =
    !isDeleted &&
    (isConfirmedFreeReward ||
      mixedPaidFree ||
      (lineDiscountMajor > 0.009 && totalPrice > 0.009));

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
    lineDiscount: lineDiscountMajor,
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
    offer_quantity: item.offer_quantity ?? item.offerQuantity ?? null,
    free_quantity: item.free_quantity ?? item.freeQuantity ?? null,
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
  return collectRawOrderItems(apiOrder, extraItems)
    .map(transformOrderItem)
    .filter(Boolean);
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
 * After picker has removed at least one line, mark remaining confirmed free-reward
 * ₹0 lines unavailable (rejected freebies). Do not mass-wipe every promo-stamped row.
 */
function markZeroOfferLinesUnavailableAfterPicker(items, _orderStatus) {
  if (!Array.isArray(items) || !items.length) return items;

  const pickerActed = items.some((it) => it?.isDeleted);
  if (!pickerActed) return items;

  return items.map((it) => {
    if (it?.isDeleted) return it;
    const isZeroConfirmedFree =
      Number(it.totalPrice) === 0 &&
      (it.isConfirmedFreeReward === true || isConfirmedFreeRewardLine(it));
    if (!isZeroConfirmedFree) return it;
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
  const state = pick("state", "province", "region");
  const zipCode = pick(
    "zipCode",
    "postalCode",
    "postal_code",
    "zip",
    "pincode",
    "pin_code",
    "pinCode",
  );
  const country = pick("country");
  const phone = pick("phone", "mobile", "contact_phone", "contactPhone");
  const area = pick("area", "locality", "suburb");
  const landmark = pick("landmark", "nearby", "near");

  if (
    !street &&
    !fullName &&
    !city &&
    !phone &&
    !zipCode &&
    !area &&
    !landmark &&
    !raw
  ) {
    return {};
  }

  return {
    ...(raw && typeof raw === "object" ? raw : {}),
    fullName: fullName || raw?.fullName || raw?.name || "",
    name: fullName || raw?.name || raw?.fullName || "",
    street: street || raw?.street || "",
    address: street || raw?.address || street,
    line1: street || raw?.line1 || "",
    line2: line2 || raw?.line2 || "",
    city: city || raw?.city || area || "",
    area: area || raw?.area || "",
    state: state || raw?.state || "",
    zipCode: zipCode || raw?.zipCode || raw?.postalCode || "",
    postalCode: zipCode || raw?.postalCode || raw?.zipCode || "",
    country: country || raw?.country || "",
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
    "zipCode",
    "postalCode",
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
    state: String(saved.state || "").trim(),
    zipCode: String(saved.zipCode || saved.postalCode || "").trim(),
    postalCode: String(saved.postalCode || saved.zipCode || "").trim(),
    country: String(saved.country || "").trim(),
    phone: String(saved.phone || "").trim(),
    landmark: String(saved.landmark || "").trim(),
  };
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

  // Coupons must not stack with BXGY. Restore every active paid line to list × paid qty
  // when the order has BXGY (covers paid rows that lack free_qty while a free sibling exists).
  const hasBxgy = orderHasBxgyOffer(itemsRaw);
  const items = hasBxgy
    ? itemsRaw.map((it) => {
        if (!it || it.isDeleted || it.isConfirmedFreeReward) return it;
        const list = Number(it.listPrice);
        if (!(list > 0)) return it;
        const paidQty = inferOrderLinePaidQuantity(it);
        if (!(paidQty > 0)) return it;
        const nextTotal = list * paidQty;
        if (
          Math.abs(Number(it.unitPrice) - list) < 0.009 &&
          Math.abs(Number(it.totalPrice) - nextTotal) < 0.009
        ) {
          return it;
        }
        return {
          ...it,
          unitPrice: list,
          price: list,
          totalPrice: nextTotal,
        };
      })
    : itemsRaw;

  // When reject/promo wipe zeroes order-level money but lines still have payable
  // totals (Items header), reconcile so Price summary matches Items / admin.
  const activeSum = items
    .filter((it) => !it?.isDeleted && !it?.isConfirmedFreeReward)
    .reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);

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

  if (hasBxgy && activeSum > 0.009) {
    subtotal = activeSum;
  } else if (!(Number(subtotal) > 0.009) && activeSum > 0.009) {
    subtotal = activeSum;
  }
  let total =
    apiOrder.total_minor != null
      ? minorToMajor(apiOrder.total_minor)
      : parseFloat(apiOrder.total || 0);
  if (hasBxgy && activeSum > 0.009) {
    total = activeSum;
  } else if (!(Number(total) > 0.009) && activeSum > 0.009) {
    total = activeSum;
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

    const orders = (response?.orders || [])
      .map((o) => transformOrder(o))
      .filter(Boolean);

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
    const mergedSource = apiOrder
      ? {
          ...response,
          ...apiOrder,
          items: topLevelItems.length ? topLevelItems : apiOrder.items,
          deliveryAddress:
            asAddressRecord(apiOrder.deliveryAddress) ||
            asAddressRecord(apiOrder.delivery_address) ||
            asAddressRecord(topLevelAddress) ||
            asAddressRecord(apiOrder.address) ||
            apiOrder.deliveryAddress,
        }
      : response && typeof response === "object"
        ? response
        : null;
    const order = transformOrder(mergedSource);
    if (order) {
      const remapped = applyUnavailableLinePasses(
        mapOrderItems(mergedSource || {}, topLevelUnavailable),
        order.subtotal,
        order.status,
      );
      order.items = remapped;
      order.itemCount = remapped.length;
    }
    return order;
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
