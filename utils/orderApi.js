/**
 * Order API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { getShopIdFromEnv } from './authApi';

function minorToMajor(minor) {
  const n = Number(minor ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

/**
 * Transform API order to frontend format
 */
function transformOrder(apiOrder) {
  if (!apiOrder) return null;

  return {
    id: apiOrder.id,
    // Storefront fields (snake_case)
    orderNumber: apiOrder.orderNumber || apiOrder.order_number || '',
    status: apiOrder.status || '',
    paymentMethod: apiOrder.paymentMethod || apiOrder.payment_method || 'cod',
    paymentStatus: apiOrder.paymentStatus || (apiOrder.payment_method ? 'pending' : ''),
    paymentId: apiOrder.paymentId || null,
    subtotal: apiOrder.subtotal_minor != null ? minorToMajor(apiOrder.subtotal_minor) : parseFloat(apiOrder.subtotal || 0),
    tax: parseFloat(apiOrder.tax || 0),
    shipping:
      apiOrder.delivery_fee_minor != null ? minorToMajor(apiOrder.delivery_fee_minor) : parseFloat(apiOrder.shipping || 0),
    discount: parseFloat(apiOrder.discount || 0),
    total: apiOrder.total_minor != null ? minorToMajor(apiOrder.total_minor) : parseFloat(apiOrder.total || 0),
    offerId: apiOrder.offerId || null,
    offerCode: apiOrder.offerCode || null,
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
    items: (apiOrder.items || []).map((item) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const unitPrice =
        item.unit_price_minor_snapshot != null
          ? minorToMajor(item.unit_price_minor_snapshot)
          : parseFloat(item.unitPrice || item.unit_price || 0);
      const totalPrice =
        item.line_total_minor != null ? minorToMajor(item.line_total_minor) : parseFloat(item.totalPrice || item.total_price || 0);
      const productName = item.productName || item.product_name || item.product_name_snapshot || 'Product';
      return {
        id: item.id,
        productId: item.productId || item.product_id,
        productName,
        productSku: item.productSku || item.product_sku,
        quantity,
        unitPrice,
        totalPrice: totalPrice || unitPrice * quantity,
        discount: parseFloat(item.discount || 0),
        product: item.product || {},
        // For display purposes (UI expects these)
        name: productName,
        image: item.product?.images?.[0] || item.product?.image || '/images/dummy.png',
        price: unitPrice,
      };
    }),
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
    const shopId = getShopIdFromEnv();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders).');

    const response = await apiFetchRoot('/storefront/orders', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const orders = (response?.orders || []).map((o) => {
      const base = transformOrder(o);
      // list endpoint doesn't include items; keep empty array to satisfy UI
      return base ? { ...base, items: [] } : null;
    }).filter(Boolean);

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
    const shopId = getShopIdFromEnv();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/orders/:id).');

    const response = await apiFetchRoot(`/storefront/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const order = transformOrder(response?.order || null);
    const items = Array.isArray(response?.items) ? response.items : [];
    if (order) {
      order.items = items.map((it) => ({
        id: it.id,
        productId: it.product_id,
        productName: it.product_name_snapshot || 'Product',
        quantity: Number(it.quantity ?? 1) || 1,
        unitPrice: minorToMajor(it.unit_price_minor_snapshot),
        totalPrice: minorToMajor(it.line_total_minor),
        name: it.product_name_snapshot || 'Product',
        image: '/images/dummy.png',
        price: minorToMajor(it.unit_price_minor_snapshot),
        product: {},
      }));
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
