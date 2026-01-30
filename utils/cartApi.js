/**
 * Cart API service functions
 * Uses the multi-tenant backend API
 */

import { api } from './apiClient';

/**
 * Transform API cart item to frontend format
 */
function transformCartItem(apiItem) {
  if (!apiItem) return null;

  return {
    id: apiItem.id,
    cartItemId: apiItem.id, // Backend cart item ID
    product: apiItem.product || {},
    productId: apiItem.product?.id || apiItem.productId,
    quantity: apiItem.quantity || 1,
    price: parseFloat(apiItem.price || apiItem.product?.price || 0),
    total: parseFloat(apiItem.total || (apiItem.price || apiItem.product?.price || 0) * (apiItem.quantity || 1)),
    // Map product fields to top level for backward compatibility
    name: apiItem.product?.name || '',
    image: apiItem.product?.images?.[0] || apiItem.product?.image || '/images/dummy.png',
    images: apiItem.product?.images || [],
    stock: apiItem.product?.stock || 0,
    inStock: apiItem.product?.isActive !== false && (apiItem.product?.stock || 0) > 0,
    unit: apiItem.product?.unit || '',
    weight: apiItem.product?.weight || null,
    // Keep original product data
    originalProduct: apiItem.product,
  };
}

/**
 * Get current user's cart
 * @returns {Promise<{items: Array, subtotal: number, total: number}>}
 */
export async function getCart() {
  try {
    const response = await api.get('/v1/cart');
    
    return {
      items: (response?.items || []).map(transformCartItem),
      subtotal: parseFloat(response?.subtotal || 0),
      total: parseFloat(response?.total || 0),
    };
  } catch (error) {
    console.error('Error fetching cart:', error);
    return { items: [], subtotal: 0, total: 0 };
  }
}

/**
 * Add product to cart
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to add
 * @returns {Promise<object>}
 */
export async function addToCart(productId, quantity = 1) {
  try {
    const response = await api.post('/v1/cart/items', {
      product_id: productId,
      quantity: quantity,
    });

    return {
      cartItem: transformCartItem(response?.cart_item || response),
      message: response?.message || 'Item added to cart',
    };
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

/**
 * Update cart item quantity
 * @param {string} itemId - Cart item UUID
 * @param {number} quantity - New quantity
 * @returns {Promise<object>}
 */
export async function updateCartItem(itemId, quantity) {
  try {
    const response = await api.put(`/v1/cart/items/${itemId}`, {
      quantity: quantity,
    });

    return {
      cartItem: transformCartItem(response?.cart_item || response),
      message: response?.message || 'Cart item updated successfully',
    };
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
}

/**
 * Remove item from cart
 * @param {string} itemId - Cart item UUID
 * @returns {Promise<void>}
 */
export async function removeFromCart(itemId) {
  try {
    await api.delete(`/v1/cart/items/${itemId}`);
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw error;
  }
}

/**
 * Clear entire cart
 * @returns {Promise<void>}
 */
export async function clearCart() {
  try {
    await api.delete('/v1/cart');
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
