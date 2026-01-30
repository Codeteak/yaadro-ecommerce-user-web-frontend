/**
 * Order API service functions
 * Uses the multi-tenant backend API
 */

import { api } from './apiClient';

/**
 * Transform API order to frontend format
 */
function transformOrder(apiOrder) {
  if (!apiOrder) return null;

  return {
    id: apiOrder.id,
    orderNumber: apiOrder.orderNumber,
    status: apiOrder.status,
    paymentMethod: apiOrder.paymentMethod,
    paymentStatus: apiOrder.paymentStatus,
    paymentId: apiOrder.paymentId,
    subtotal: parseFloat(apiOrder.subtotal || 0),
    tax: parseFloat(apiOrder.tax || 0),
    shipping: parseFloat(apiOrder.shipping || 0),
    discount: parseFloat(apiOrder.discount || 0),
    total: parseFloat(apiOrder.total || 0),
    offerId: apiOrder.offerId || null,
    offerCode: apiOrder.offerCode || null,
    offerDetails: apiOrder.offerDetails || null,
    deliveryAddress: apiOrder.deliveryAddress || apiOrder.delivery_address || apiOrder.shippingAddress || apiOrder.shipping_address || {},
    notes: apiOrder.notes || null,
    cancelledAt: apiOrder.cancelledAt || null,
    cancelledReason: apiOrder.cancelledReason || null,
    deliveredAt: apiOrder.deliveredAt || null,
    items: (apiOrder.items || []).map(item => ({
      id: item.id,
      productId: item.productId || item.product_id,
      productName: item.productName || item.product_name,
      productSku: item.productSku || item.product_sku,
      quantity: item.quantity || 1,
      unitPrice: parseFloat(item.unitPrice || item.unit_price || 0),
      totalPrice: parseFloat(item.totalPrice || item.total_price || 0),
      discount: parseFloat(item.discount || 0),
      product: item.product || {},
      // For display purposes
      name: item.productName || item.product_name || item.product?.name || 'Product',
      image: item.product?.images?.[0] || item.product?.image || '/images/dummy.png',
      price: parseFloat(item.unitPrice || item.unit_price || 0),
    })),
    createdAt: apiOrder.createdAt || apiOrder.created_at || '',
    updatedAt: apiOrder.updatedAt || apiOrder.updated_at || '',
    // Helper flags
    canCancel: ['pending', 'confirmed'].includes(apiOrder.status),
    canModify: apiOrder.status === 'confirmed',
  };
}

/**
 * Create order from cart
 * @param {object} orderData - Order data
 * @returns {Promise<{order: object, payment: object}>}
 */
export async function createOrder(orderData) {
  try {
    const response = await api.post('/v1/orders', orderData);
    
    return {
      order: transformOrder(response?.order || response),
      payment: response?.payment || {},
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Verify payment after Razorpay payment
 * @param {string} orderId - Order ID
 * @param {object} paymentData - Payment response from Razorpay
 * @returns {Promise<object>}
 */
export async function verifyPayment(orderId, paymentData) {
  try {
    const response = await api.post(`/v1/orders/${orderId}/verify-payment`, paymentData);
    return response;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

/**
 * Get all orders for current user
 * @param {object} params - Query parameters (page, per_page)
 * @returns {Promise<{orders: array, pagination: object}>}
 */
export async function listOrders(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    
    const queryString = queryParams.toString();
    const url = `/v1/orders${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    
    return {
      orders: (response?.orders || []).map(order => transformOrder(order)),
      pagination: response?.pagination || {
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0,
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
    const response = await api.get(`/v1/orders/${orderId}`);
    return transformOrder(response?.order || response);
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
  try {
    const response = await api.post(`/v1/orders/${orderId}/cancel`, { reason });
    return transformOrder(response?.order || response);
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
}

/**
 * Retry payment for an order
 * @param {string} orderId - Order ID
 * @param {string} paymentMethod - Optional payment method (upi, card, etc.)
 * @returns {Promise<{order: object, payment: object}>}
 */
export async function retryPayment(orderId, paymentMethod = null) {
  try {
    const requestBody = paymentMethod ? { payment_method: paymentMethod } : {};
    
    // Try the retry-payment endpoint first
    try {
      const response = await api.post(`/v1/orders/${orderId}/retry-payment`, requestBody);
      return {
        order: transformOrder(response?.order || response),
        payment: response?.payment || {},
      };
    } catch (retryError) {
      // If retry-payment endpoint doesn't exist (404), try alternative approach
      if (retryError.status === 404) {
        console.warn('Retry payment endpoint not found, trying alternative approach...');
        
        // Alternative: Get order details and check if it has payment info
        // If order has paymentId, we can try to reuse it or create new payment
        const orderDetails = await api.get(`/v1/orders/${orderId}`);
        const order = orderDetails?.order || orderDetails;
        
        if (order && order.paymentId) {
          // If order has paymentId, return it for Razorpay initialization
          // Note: This assumes backend can provide payment details via order details
          // You may need to adjust this based on your backend implementation
          return {
            order: transformOrder(order),
            payment: {
              razorpay: {
                razorpayOrderId: order.paymentId,
                // Note: keyId and amount should come from backend or config
                // This is a fallback - backend should provide these
              },
            },
          };
        }
        
        throw new Error('Payment retry not available. Please contact support.');
      }
      throw retryError;
    }
  } catch (error) {
    console.error('Error retrying payment:', error);
    throw error;
  }
}
