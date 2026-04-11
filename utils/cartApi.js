/**
 * Cart API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { getShopIdFromEnv } from './authApi';
import { getProductById } from './productApi';

function minorToMajor(minor) {
  const n = Number(minor ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

async function ensureCartExists(shopId) {
  // Best-effort. If cart already exists server still returns 200.
  try {
    await apiFetchRoot('/storefront/cart', {
      method: 'POST',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });
  } catch {
    // ignore (GET/add will surface real errors)
  }
}

/**
 * Transform API cart item to frontend format
 */
function transformCartItem(apiItem, product = null) {
  if (!apiItem) return null;

  const quantity = Number(apiItem.quantity ?? 1) || 1;
  const unitPrice = minorToMajor(apiItem.unit_price_minor);
  const offerUnitPrice =
    apiItem.offer_price_minor_per_unit !== undefined && apiItem.offer_price_minor_per_unit !== null
      ? minorToMajor(apiItem.offer_price_minor_per_unit)
      : null;

  const effectiveUnitPrice = offerUnitPrice != null && offerUnitPrice > 0 ? offerUnitPrice : unitPrice;
  const originalPrice = offerUnitPrice != null && offerUnitPrice > 0 && unitPrice > effectiveUnitPrice ? unitPrice : null;

  return {
    id: apiItem.id,
    cartItemId: apiItem.id, // Backend cart item ID
    product: product || null,
    productId: apiItem.product_id || apiItem.productId || product?.id,
    quantity,
    price: effectiveUnitPrice,
    originalPrice,
    total: effectiveUnitPrice * quantity,
    // Map product fields to top level for backward compatibility
    name: product?.name || apiItem.title_snapshot || '',
    image: product?.image || product?.images?.[0] || '/images/dummy.png',
    images: product?.images || [],
    stock: product?.stock || 0,
    inStock: product?.inStock ?? true,
    unit: product?.unit || apiItem.unit_label || '',
    weight: product?.weight || null,
    // Keep original product data
    originalProduct: product || null,
  };
}

/**
 * Get current user's cart
 * @returns {Promise<{items: Array, subtotal: number, total: number}>}
 */
export async function getCart() {
  try {
    const shopId = getShopIdFromEnv();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    await ensureCartExists(shopId);
    const response = await apiFetchRoot('/storefront/cart', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const itemsRaw = Array.isArray(response?.items) ? response.items : [];
    const productIds = [...new Set(itemsRaw.map((it) => it?.product_id).filter(Boolean))];
    const productsById = new Map();
    await Promise.all(
      productIds.map(async (id) => {
        const p = await getProductById(id);
        if (p) productsById.set(id, p);
      })
    );

    const items = itemsRaw
      .map((it) => transformCartItem(it, productsById.get(it?.product_id) || null))
      .filter(Boolean);

    const summary = response?.summary || {};
    const subtotal = minorToMajor(summary.total_price_minor);
    const totalOffer = minorToMajor(summary.total_offer_price_minor);
    const total = totalOffer > 0 ? totalOffer : subtotal;

    return {
      items,
      subtotal,
      total,
      discount: minorToMajor(summary.total_discount_minor),
      currency: summary.currency || 'INR',
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
    const shopId = getShopIdFromEnv();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    await ensureCartExists(shopId);
    const response = await apiFetchRoot('/storefront/cart/items', {
      method: 'POST',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body: {
        productId,
        quantity,
      },
    });

    const product = await getProductById(productId);
    return {
      cartItem: transformCartItem(response, product),
      message: 'Item added to cart',
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
    const shopId = getShopIdFromEnv();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    const response = await apiFetchRoot(`/storefront/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body: { quantity },
    });

    return {
      cartItem: transformCartItem(response, null),
      message: 'Cart item updated successfully',
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
    const shopId = getShopIdFromEnv();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    await apiFetchRoot(`/storefront/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });
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
    // Backend exposes item delete; clear by fetching cart and deleting lines.
    const cart = await getCart();
    await Promise.all((cart.items || []).map((it) => removeFromCart(it.cartItemId || it.id)));
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
