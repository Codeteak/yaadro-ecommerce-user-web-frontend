/**
 * Order API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import {
  minorToMajor,
  parseMinorInt,
  parseOrderQuantity,
  isOrderLineUnavailable,
} from './orderPromotions';
import {
  formatWeightUnitLabel,
  parseProductUnitSize,
  resolveProductWeightAndUnit,
} from './productUtils';

function firstImageUrl(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.includes(',')) return s.split(',')[0].trim() || null;
  return s;
}

function resolveOrderItemImage(item = {}) {
  const nested =
    typeof item?.image === 'object' && item?.image != null ? item.image.url : item?.image;
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
    '/images/dummy.png'
  );
}

function transformOrderItem(item) {
  if (!item) return null;
  const quantity = parseOrderQuantity(item.quantity);
  const unitPriceMinor = parseMinorInt(item.unit_price_minor_snapshot ?? item.unitPriceMinorSnapshot);
  const hasLineTotalMinor =
    (item.line_total_minor != null && item.line_total_minor !== '') ||
    (item.lineTotalMinor != null && item.lineTotalMinor !== '');
  const lineTotalMinor = hasLineTotalMinor
    ? parseMinorInt(item.line_total_minor ?? item.lineTotalMinor)
    : null;
  const listPriceMinor = parseMinorInt(item.list_price_minor ?? item.listPriceMinor);
  const lineDiscountMinor = parseMinorInt(item.line_discount_minor ?? item.lineDiscountMinor);
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
    'Product';
  const unitPrice =
    unitPriceMinor > 0
      ? minorToMajor(unitPriceMinor)
      : parseFloat(item.unitPrice || item.unit_price || 0) || 0;

  const hasTotalPriceMajor =
    (item.totalPrice != null && item.totalPrice !== '') ||
    (item.total_price != null && item.total_price !== '');

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

  const listPrice = listPriceMinor > 0 ? minorToMajor(listPriceMinor) : null;

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
    if (raw == null || raw === '') return null;
    const n = parseFloat(String(raw));
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const hasOfferSignal = appliedPromotionIds.length > 0 || lineDiscountMinor > 0;

  const isDeleted = isOrderLineUnavailable(item, {
    quantity,
    originalQuantity,
    lineTotalMinor,
    unitPriceMinor,
    unitPrice,
    totalPrice,
    lineTotalExplicitZero,
    hasOfferSignal,
  });

  const shopQuantityAdjusted =
    item.quantityAdjusted === true ||
    item.quantity_adjusted === true ||
    item.shopQuantityUpdated === true ||
    item.shop_quantity_updated === true ||
    item.shopUpdated === true ||
    item.shop_updated === true;

  const hasOffer = !isDeleted && hasOfferSignal;
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
    unitLabel: item.unit_label_snapshot ?? item.unitLabel ?? unit ?? '',
    unitSize,
    weight,
    unit,
    packLabel,
    quantity,
    unitPrice,
    listPrice,
    lineDiscountMinor,
    lineDiscount: minorToMajor(lineDiscountMinor),
    totalPrice,
    appliedPromotionIds,
    hasOffer,
    isDeleted,
    originalQuantity,
    shopQuantityAdjusted,
    product: item.product || {},
    name: productName,
    image: resolveOrderItemImage(item),
    price: unitPrice,
    discount: parseFloat(item.discount || 0),
  };
}

function lineDedupeKey(raw) {
  if (!raw || typeof raw !== 'object') return '';
  if (raw.id != null && String(raw.id).trim()) return `id:${String(raw.id).trim()}`;
  const pid = raw.product_id ?? raw.productId;
  if (pid != null && String(pid).trim()) return `pid:${String(pid).trim()}`;
  const name = raw.product_name_snapshot || raw.productName || raw.product_name || raw.name || '';
  return name ? `name:${String(name).trim().toLowerCase()}` : '';
}

/**
 * Merge primary items with sibling unavailable/removed arrays from order payloads.
 */
function collectRawOrderItems(apiOrder, extraItems = []) {
  const primary = Array.isArray(apiOrder?.items) ? apiOrder.items : [];
  const siblings = [
    ...(Array.isArray(extraItems) ? extraItems : []),
    ...(Array.isArray(apiOrder?.unavailable_items) ? apiOrder.unavailable_items : []),
    ...(Array.isArray(apiOrder?.unavailableItems) ? apiOrder.unavailableItems : []),
    ...(Array.isArray(apiOrder?.removed_items) ? apiOrder.removed_items : []),
    ...(Array.isArray(apiOrder?.removedItems) ? apiOrder.removedItems : []),
    ...(Array.isArray(apiOrder?.rejected_items) ? apiOrder.rejected_items : []),
    ...(Array.isArray(apiOrder?.rejectedItems) ? apiOrder.rejectedItems : []),
  ];

  const primaryKeys = new Set(primary.map(lineDedupeKey).filter(Boolean));
  const out = [...primary];

  for (const raw of siblings) {
    if (!raw || typeof raw !== 'object') continue;
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
  return collectRawOrderItems(apiOrder, extraItems).map(transformOrderItem).filter(Boolean);
}

/**
 * When picker drops a line from order totals but leaves unit×qty on the item,
 * mark that non-offer line unavailable if removing it makes line sums match subtotal.
 */
function markUnavailableExcludedFromSubtotal(items, subtotalMajor) {
  if (!Array.isArray(items) || !items.length) return items;
  const subtotal = Number(subtotalMajor);
  if (!Number.isFinite(subtotal)) return items;

  const sumAll = items.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
  if (Math.abs(sumAll - subtotal) < 0.02) return items;

  const candidates = items.filter(
    (it) =>
      !it.isDeleted &&
      !it.hasOffer &&
      Number(it.quantity) > 0 &&
      Number(it.unitPrice || it.price || 0) > 0 &&
      Number(it.totalPrice) > 0.009
  );
  if (!candidates.length) return items;

  for (const candidate of candidates) {
    const without = sumAll - (Number(candidate.totalPrice) || 0);
    if (Math.abs(without - subtotal) < 0.02) {
      return items.map((it) =>
        it === candidate || (it.id != null && it.id === candidate.id)
          ? { ...it, isDeleted: true, totalPrice: 0, hasOffer: false }
          : it
      );
    }
  }

  return items;
}

/**
 * After picker has removed at least one line, treat remaining ₹0 "offer" lines as
 * unavailable too (promo ids often linger on rejected freebies).
 * Runs regardless of order status (status can briefly fall back to pending).
 */
function markZeroOfferLinesUnavailableAfterPicker(items, _orderStatus) {
  if (!Array.isArray(items) || !items.length) return items;

  const pickerActed = items.some((it) => it?.isDeleted);
  if (!pickerActed) return items;

  return items.map((it) => {
    if (it?.isDeleted) return it;
    const isZeroOffer =
      Number(it.totalPrice) === 0 &&
      (it.hasOffer === true ||
        (Array.isArray(it.appliedPromotionIds) && it.appliedPromotionIds.length > 0) ||
        Number(it.lineDiscountMinor) > 0);
    if (!isZeroOffer) return it;
    return { ...it, isDeleted: true, hasOffer: false, totalPrice: 0 };
  });
}

function applyUnavailableLinePasses(items, subtotalMajor, orderStatus) {
  const afterSubtotal = markUnavailableExcludedFromSubtotal(items, subtotalMajor);
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
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!s) return 'pending';

  const direct = {
    pending: 'pending',
    placed: 'pending',
    new: 'pending',
    created: 'pending',
    open: 'pending',
    accepted: 'confirmed',
    accept: 'confirmed',
    approved: 'confirmed',
    acknowledged: 'confirmed',
    acknowledgement: 'confirmed',
    order_confirmed: 'confirmed',
    confirmed: 'confirmed',
    confirm: 'confirmed',
    assigned: 'confirmed',
    assigned_to_picker: 'confirmed',
    picker_assigned: 'confirmed',
    ready_for_picker: 'confirmed',
    processing: 'processing',
    in_progress: 'processing',
    inprogress: 'processing',
    packing: 'processing',
    preparing: 'processing',
    packed: 'processing',
    picking: 'processing',
    picker: 'processing',
    in_picking: 'processing',
    pick_in_progress: 'processing',
    allocated: 'processing',
    ready_to_pack: 'processing',
    ready: 'processing',
    item_ready: 'processing',
    items_ready: 'processing',
    picked: 'processing',
    partially_picked: 'processing',
    partial: 'processing',
    partial_pick: 'processing',
    picking_complete: 'processing',
    pick_complete: 'processing',
    ready_for_dispatch: 'processing',
    shipped: 'shipped',
    ship: 'shipped',
    dispatched: 'shipped',
    out_for_delivery: 'shipped',
    outfordelivery: 'shipped',
    delivering: 'shipped',
    in_transit: 'shipped',
    intransit: 'shipped',
    delivered: 'delivered',
    delivery: 'delivered',
    completed: 'delivered',
    complete: 'delivered',
    cancelled: 'cancelled',
    canceled: 'cancelled',
  };
  if (direct[s]) return direct[s];
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('deliver') && (s.includes('ed') || s.endsWith('ed'))) return 'delivered';
  if (s.includes('deliver') || s.includes('ship') || s.includes('dispatch') || s.includes('transit')) return 'shipped';
  if (
    s.includes('process') ||
    s.includes('pack') ||
    s.includes('pick') ||
    s.includes('allocat') ||
    s.includes('ready')
  ) {
    return 'processing';
  }
  if (
    s.includes('accept') ||
    s.includes('confirm') ||
    s.includes('approv') ||
    s.includes('assign')
  ) {
    return 'confirmed';
  }
  return 'pending';
}

/** Prefer the furthest fulfillment stage when APIs split status across fields. */
export function pickFurthestFulfillmentStatus(rawCandidates) {
  const list = Array.isArray(rawCandidates) ? rawCandidates : [rawCandidates];
  let best = 'pending';
  let bestRank = FULFILLMENT_RANK.pending;
  for (const raw of list) {
    if (raw == null || raw === '') continue;
    const normalized = normalizeFulfillmentStatus(raw);
    const rank = FULFILLMENT_RANK[normalized] ?? 0;
    if (normalized === 'cancelled') return 'cancelled';
    if (rank > bestRank) {
      best = normalized;
      bestRank = rank;
    }
  }
  return best;
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
  const methodRaw = apiOrder.paymentMethod || apiOrder.payment_method || 'cod';
  const paymentStatusRaw = apiOrder.paymentStatus || apiOrder.payment_status || '';
  const promotionDiscountMinor = parseMinorInt(
    apiOrder.promotion_discount_total_minor ?? apiOrder.promotionDiscountTotalMinor
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
  const mappedItems = mapOrderItems(apiOrder);
  const promotionDiscountMajor = minorToMajor(promotionDiscountMinor);
  const subtotal =
    apiOrder.subtotal_minor != null
      ? minorToMajor(apiOrder.subtotal_minor)
      : parseFloat(apiOrder.subtotal || 0);
  const items = applyUnavailableLinePasses(mappedItems, subtotal, status);

  return {
    id: apiOrder.id,
    // Storefront fields (snake_case)
    orderNumber: apiOrder.orderNumber || apiOrder.order_number || '',
    status,
    paymentMethod: methodRaw,
    paymentStatus: (() => {
      if (paymentStatusRaw) return String(paymentStatusRaw).trim();
      const m = String(methodRaw || '').toLowerCase();
      if (m === 'cod' || m === 'cash_on_delivery') return 'cod';
      return 'pending';
    })(),
    paymentId: apiOrder.paymentId || null,
    subtotal,
    tax: parseFloat(apiOrder.tax || 0),
    shipping:
      apiOrder.delivery_fee_minor != null ? minorToMajor(apiOrder.delivery_fee_minor) : parseFloat(apiOrder.shipping || 0),
    discount:
      promotionDiscountMajor > 0
        ? promotionDiscountMajor
        : parseFloat(apiOrder.discount || 0),
    total: apiOrder.total_minor != null ? minorToMajor(apiOrder.total_minor) : parseFloat(apiOrder.total || 0),
    promotionDiscountMinor,
    promotionDiscountMajor,
    couponCode: couponCode ? String(couponCode).trim() : null,
    appliedPromotionIds,
    deliveryTrackingUrl:
      (typeof apiOrder.deliveryTrackingUrl === 'string' && apiOrder.deliveryTrackingUrl.trim()) ||
      (typeof apiOrder.delivery_tracking_url === 'string' && apiOrder.delivery_tracking_url.trim()) ||
      null,
    yadroOrderId:
      apiOrder.yadroOrderId != null
        ? String(apiOrder.yadroOrderId)
        : apiOrder.yadro_order_id != null
          ? String(apiOrder.yadro_order_id)
          : null,
    offerId: apiOrder.offerId || null,
    offerCode: apiOrder.offerCode || couponCode || null,
    offerDetails: apiOrder.offerDetails || null,
    deliveryAddress:
      apiOrder.deliveryAddress ||
      apiOrder.delivery_address ||
      apiOrder.shippingAddress ||
      apiOrder.shipping_address ||
      {},
    notes: apiOrder.notes || null,
    cancelledAt: apiOrder.cancelledAt || null,
    cancelledReason: apiOrder.cancelledReason || null,
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
          items.length
      ) || items.length,
    items,
    createdAt: apiOrder.createdAt || apiOrder.created_at || apiOrder.placed_at || '',
    updatedAt: apiOrder.updatedAt || apiOrder.updated_at || '',
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
  throw new Error('createOrder is not supported. Use POST /storefront/checkout instead.');
}

/**
 * Verify payment after Razorpay payment
 * @param {string} orderId - Order ID
 * @param {object} paymentData - Payment response from Razorpay
 * @returns {Promise<object>}
 */
export async function verifyPayment(orderId, paymentData) {
  throw new Error('Payment verification is not supported by this storefront API.');
}

/**
 * Get orders for current user. API supports `limit` only (1–100), newest first.
 * @param {object} params
 * @returns {Promise<{orders: array, pagination: object}>}
 */
export async function listOrders(params = {}) {
  try {
    const shopId = await resolveShopId();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders).');

    const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit ?? params.per_page) || 50)));

    const response = await apiFetchRoot('/storefront/orders', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      query: { limit },
    });

    const orders = (response?.orders || []).map((o) => transformOrder(o)).filter(Boolean);

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
    console.error('Error listing orders:', error);
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
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders/:id).');

    const response = await apiFetchRoot(`/storefront/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const apiOrder = response?.order || null;
    const topLevelItems = Array.isArray(response?.items) ? response.items : [];
    const topLevelUnavailable = [
      ...(Array.isArray(response?.unavailable_items) ? response.unavailable_items : []),
      ...(Array.isArray(response?.unavailableItems) ? response.unavailableItems : []),
      ...(Array.isArray(response?.removed_items) ? response.removed_items : []),
      ...(Array.isArray(response?.removedItems) ? response.removedItems : []),
      ...(Array.isArray(response?.rejected_items) ? response.rejected_items : []),
      ...(Array.isArray(response?.rejectedItems) ? response.rejectedItems : []),
    ];
    const mergedSource = apiOrder
      ? {
          ...apiOrder,
          items: topLevelItems.length ? topLevelItems : apiOrder.items,
        }
      : null;
    const order = transformOrder(mergedSource);
    if (order) {
      const remapped = applyUnavailableLinePasses(
        mapOrderItems(mergedSource || {}, topLevelUnavailable),
        order.subtotal,
        order.status
      );
      order.items = remapped;
      order.itemCount = remapped.length;
    }
    return order;
  } catch (error) {
    console.error('Error getting order:', error);
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
  throw new Error('Cancel order is not supported by this storefront API.');
}

/**
 * Retry payment for an order
 * @param {string} orderId - Order ID
 * @param {string} paymentMethod - Optional payment method (upi, card, etc.)
 * @returns {Promise<{order: object, payment: object}>}
 */
export async function retryPayment(orderId, paymentMethod = null) {
  throw new Error('Retry payment is not supported by this storefront API.');
}
