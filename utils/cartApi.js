/**
 * Cart API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { getProductById } from './productApi';
import { getResolvedProductImageUrls, PRODUCT_IMAGE_PLACEHOLDER } from './productImages';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function minorToMajor(minor) {
  const n = Number(minor ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

async function resolveProductIdForCart(productInput) {
  const raw =
    typeof productInput === 'string'
      ? productInput
      : productInput?.productId || productInput?.id || productInput?.slug;
  const normalized = String(raw || '').trim();
  if (!normalized) return '';
  if (isUuid(normalized)) return normalized;

  // Backward compatibility for old local carts that may store slug/non-UUID ids.
  const resolvedProduct = await getProductById(normalized);
  return isUuid(resolvedProduct?.id) ? resolvedProduct.id : '';
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

/** Image URL strings sometimes included on cart line snapshots when `product` is omitted. */
function snapshotImageFromCartApiItem(apiItem) {
  if (!apiItem || typeof apiItem !== 'object') return '';
  const keys = [
    'image_snapshot',
    'image_snapshot_url',
    'image_url_snapshot',
    'product_image_url',
    'thumbnail_url',
    'thumbnail_snapshot',
    'image_url',
    'cover_image_url',
    'primary_image_url',
    'picture_url',
    'photo_url',
  ];
  for (const k of keys) {
    const v = apiItem[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  if (typeof apiItem.image === 'string' && apiItem.image.trim()) return apiItem.image.trim();
  return '';
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

  const nestedProduct =
    product ||
    (apiItem.product && typeof apiItem.product === 'object' ? apiItem.product : null) ||
    (apiItem.product_snapshot && typeof apiItem.product_snapshot === 'object'
      ? apiItem.product_snapshot
      : null);

  const snapshotImg = snapshotImageFromCartApiItem(apiItem);
  const fromNestedGallery =
    nestedProduct != null
      ? getResolvedProductImageUrls(nestedProduct).find((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER)
      : '';

  const primaryImage =
    fromNestedGallery ||
    snapshotImg ||
    (typeof nestedProduct?.image === 'string' && nestedProduct.image.trim() ? nestedProduct.image.trim() : '') ||
    '/images/dummy.png';

  const imagesList =
    Array.isArray(nestedProduct?.images) && nestedProduct.images.length > 0
      ? nestedProduct.images
      : snapshotImg
        ? [snapshotImg]
        : [];

  return {
    id: apiItem.id,
    cartItemId: apiItem.id, // Backend cart item ID
    product: nestedProduct,
    productId: apiItem.product_id || apiItem.productId || nestedProduct?.id,
    quantity,
    price: effectiveUnitPrice,
    originalPrice,
    total: effectiveUnitPrice * quantity,
    // Map product fields to top level for backward compatibility
    name: nestedProduct?.name || apiItem.title_snapshot || '',
    image: primaryImage,
    images: imagesList,
    stock: nestedProduct?.stock || 0,
    inStock: nestedProduct?.inStock ?? true,
    unit: nestedProduct?.unit || apiItem.unit_label || '',
    weight: nestedProduct?.weight || null,
    // Keep original product data
    originalProduct: nestedProduct || null,
  };
}

/**
 * Get current user's cart
 * @returns {Promise<{items: Array, subtotal: number, total: number}>}
 */
export async function getCart() {
  try {
    const shopId = await resolveShopId();
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
    // Do NOT call `/storefront/products/:id` with UUIDs from cart lines.
    // Backend product-detail endpoint expects slug. Cart API includes snapshots we can render with.
    const items = itemsRaw
      .map((it) => {
        const embedded =
          it.product && typeof it.product === 'object'
            ? it.product
            : it.product_snapshot && typeof it.product_snapshot === 'object'
              ? it.product_snapshot
              : null;
        return transformCartItem(it, embedded);
      })
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
 * @param {string|object} productInput - Product UUID or product-like object
 * @param {number} quantity - Quantity to add
 * @returns {Promise<object>}
 */
export async function addToCart(productInput, quantity = 1) {
  try {
    const productId = await resolveProductIdForCart(productInput);
    if (!productId) {
      throw new Error('Invalid productId for cart API (must be UUID).');
    }
    const safeQuantity = Math.max(1, Number(quantity) || 1);

    const shopId = await resolveShopId();
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
        quantity: safeQuantity,
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
    const shopId = await resolveShopId();
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
    const shopId = await resolveShopId();
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
