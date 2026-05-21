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
} from './orderPromotions';

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
  const lineTotalMinor = parseMinorInt(item.line_total_minor ?? item.lineTotalMinor);
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
  const unitPrice = unitPriceMinor > 0 ? minorToMajor(unitPriceMinor) : parseFloat(item.unitPrice || item.unit_price || 0);
  const totalPrice =
    lineTotalMinor > 0
      ? minorToMajor(lineTotalMinor)
      : parseFloat(item.totalPrice || item.total_price || 0) || unitPrice * quantity;
  const listPrice = listPriceMinor > 0 ? minorToMajor(listPriceMinor) : null;

  const isDeleted =
    item.isDeleted === true ||
    item.is_deleted === true ||
    item.deleted === true ||
    item.removed === true;

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

  const shopQuantityAdjusted =
    item.quantityAdjusted === true ||
    item.quantity_adjusted === true ||
    item.shopQuantityUpdated === true ||
    item.shop_quantity_updated === true ||
    item.shopUpdated === true ||
    item.shop_updated === true;

  const hasOffer =
    !isDeleted && (appliedPromotionIds.length > 0 || lineDiscountMinor > 0);
  return {
    id: item.id,
    productId: item.product_id ?? item.productId,
    productSlug: item.product_slug ?? item.productSlug,
    productName,
    productSku: item.productSku ?? item.product_sku,
    unitLabel: item.unit_label_snapshot ?? item.unitLabel ?? '',
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
    processing: 'processing',
    in_progress: 'processing',
    inprogress: 'processing',
    packing: 'processing',
    preparing: 'processing',
    packed: 'processing',
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
  if (s.includes('process') || s.includes('pack')) return 'processing';
  if (s.includes('accept') || s.includes('confirm') || s.includes('approv')) return 'confirmed';
  return 'pending';
}

/**
 * Transform API order to frontend format
 */
function transformOrder(apiOrder) {
  if (!apiOrder) return null;

  const rawStatus =
    apiOrder.status || apiOrder.order_status || apiOrder.fulfillment_status || apiOrder.state || '';
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
  const promotionDiscountMajor = minorToMajor(promotionDiscountMinor);

  return {
    id: apiOrder.id,
    // Storefront fields (snake_case)
    orderNumber: apiOrder.orderNumber || apiOrder.order_number || '',
    status: normalizeFulfillmentStatus(rawStatus),
    paymentMethod: methodRaw,
    paymentStatus: (() => {
      if (paymentStatusRaw) return String(paymentStatusRaw).trim();
      const m = String(methodRaw || '').toLowerCase();
      if (m === 'cod' || m === 'cash_on_delivery') return 'cod';
      return 'pending';
    })(),
    paymentId: apiOrder.paymentId || null,
    subtotal: apiOrder.subtotal_minor != null ? minorToMajor(apiOrder.subtotal_minor) : parseFloat(apiOrder.subtotal || 0),
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
    shippedAt: apiOrder.shippedAt || apiOrder.shipped_at || null,
    itemCount:
      Number(
        apiOrder.itemCount ??
          apiOrder.item_count ??
          apiOrder.itemsCount ??
          apiOrder.items_count ??
          apiOrder.total_items ??
          apiOrder.totalItems ??
          (Array.isArray(apiOrder.items) ? apiOrder.items.length : 0)
      ) || 0,
    items: (apiOrder.items || []).map(transformOrderItem).filter(Boolean),
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
 * Get all orders for current user
 * @param {object} params - Query parameters (page, per_page)
 * @returns {Promise<{orders: array, pagination: object}>}
 */
export async function listOrders(params = {}) {
  try {
    const shopId = await resolveShopId();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders).');

    const response = await apiFetchRoot('/storefront/orders', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const orders = (response?.orders || []).map((o) => transformOrder(o)).filter(Boolean);

    return {
      orders,
      pagination: {
        page: params.page || 1,
        per_page: params.per_page || orders.length || 20,
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
    const items = Array.isArray(response?.items) ? response.items : [];
    const order = transformOrder(
      apiOrder ? { ...apiOrder, items: items.length ? items : apiOrder.items } : null
    );
    if (order && items.length) {
      order.items = items.map(transformOrderItem).filter(Boolean);
      order.itemCount = order.items.length;
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
