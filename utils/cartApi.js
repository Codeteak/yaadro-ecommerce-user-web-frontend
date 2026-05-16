/**
 * Cart API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { getProductById } from './productApi';
import {
  getResolvedProductImageUrls,
  PRODUCT_IMAGE_PLACEHOLDER,
  resolveCartLineImageUrls,
} from './productImages';
import { minorToMajor, parseMinorInt } from './currencyMinor';
import {
  getPaidCartItemId,
  isBundleRewardCartLine,
  isBundleRewardCartLineId,
  normalizeCartPromotions,
  sumCartDisplayUnits,
} from './cartPromotions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

/** Read quantity from legacy flat fields or v2 nested `quantity` object. */
function readCartLineQuantityFields(apiItem) {
  const q = apiItem?.quantity;
  if (q && typeof q === 'object' && !Array.isArray(q)) {
    return {
      billable: Number(q.billable ?? q.billable_quantity) || 0,
      paid: Number(q.paid ?? q.paid_quantity) || 0,
      free: Number(q.free ?? q.free_quantity) || 0,
      display: Number(q.display ?? q.display_quantity) || 0,
    };
  }
  const rawQty = Number(apiItem?.quantity ?? 1) || 1;
  return {
    billable: Number(apiItem?.billable_quantity ?? apiItem?.billableQuantity) || rawQty,
    paid: Number(apiItem?.paid_quantity ?? apiItem?.paidQuantity) || rawQty,
    free: Number(apiItem?.free_quantity ?? apiItem?.freeQuantity) || 0,
    display: Number(apiItem?.display_quantity ?? apiItem?.displayQuantity) || rawQty,
  };
}

/**
 * Flatten v2 storefront cart line (`quantity`, `pricing`, `promo`) for `transformCartItem`.
 * Legacy flat responses pass through unchanged.
 */
function normalizeStorefrontCartItemRaw(apiItem) {
  if (!apiItem || typeof apiItem !== 'object') return apiItem;

  const hasNestedQty = apiItem.quantity && typeof apiItem.quantity === 'object' && !Array.isArray(apiItem.quantity);
  const pricing = apiItem.pricing && typeof apiItem.pricing === 'object' ? apiItem.pricing : null;
  const promo = apiItem.promo && typeof apiItem.promo === 'object' ? apiItem.promo : null;

  if (!hasNestedQty && !pricing && !promo) return apiItem;

  const qty = readCartLineQuantityFields(apiItem);
  const isBundleReward = isBundleRewardCartLine(apiItem);
  const lineQty = isBundleReward
    ? qty.free > 0
      ? qty.free
      : qty.display > 0
        ? qty.display
        : 1
    : qty.paid > 0
      ? qty.paid
      : qty.billable > 0
        ? qty.billable
        : 1;

  return {
    ...apiItem,
    product_id: apiItem.product_id ?? apiItem.productId,
    product_slug: apiItem.slug ?? apiItem.product_slug ?? apiItem.productSlug,
    title_snapshot: apiItem.title ?? apiItem.title_snapshot ?? apiItem.titleSnapshot ?? '',
    unit_label: apiItem.unit ?? apiItem.unit_label ?? apiItem.unitLabel ?? '',
    image_url: apiItem.image_url ?? apiItem.imageUrl ?? null,
    global_image_url: apiItem.global_image_url ?? apiItem.globalImageUrl ?? null,
    quantity: lineQty,
    billable_quantity: qty.billable || lineQty,
    paid_quantity: qty.paid,
    free_quantity: qty.free,
    display_quantity: qty.display > 0 ? qty.display : lineQty,
    list_price_minor_per_unit: pricing?.list_minor ?? apiItem.list_price_minor_per_unit,
    offer_price_minor_per_unit: pricing?.offer_minor ?? apiItem.offer_price_minor_per_unit,
    final_price_minor: pricing?.final_minor ?? apiItem.final_price_minor,
    line_total_minor: pricing?.line_total_minor ?? apiItem.line_total_minor,
    list_price_minor: pricing?.list_minor ?? apiItem.list_price_minor,
    unit_price_minor: pricing?.list_minor ?? apiItem.unit_price_minor,
    is_bundle_reward: apiItem.is_bundle_reward ?? apiItem.isBundleReward ?? false,
    bundle_source_cart_item_id:
      apiItem.bundle_source_item_id ??
      apiItem.bundle_source_cart_item_id ??
      apiItem.bundleSourceItemId ??
      apiItem.bundleSourceCartItemId ??
      null,
    applied_promotion_ids:
      promo?.promotion_ids ?? apiItem.applied_promotion_ids ?? apiItem.appliedPromotionIds ?? [],
  };
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

function resolveCartLinePricing(apiItem, quantity, isBundleReward) {
  const pricing = apiItem.pricing && typeof apiItem.pricing === 'object' ? apiItem.pricing : null;
  const listPerUnitMinor = parseMinorInt(
    pricing?.list_minor ??
      apiItem.list_price_minor_per_unit ??
      apiItem.listPriceMinorPerUnit ??
      apiItem.list_price_minor ??
      apiItem.listPriceMinor
  );
  const finalPerUnitMinor = parseMinorInt(
    pricing?.final_minor ?? apiItem.final_price_minor ?? apiItem.finalPriceMinor
  );
  const lineTotalMinor = parseMinorInt(
    pricing?.line_total_minor ?? apiItem.line_total_minor ?? apiItem.lineTotalMinor
  );
  const offerFromPricing = pricing?.offer_minor != null ? minorToMajor(pricing.offer_minor) : null;
  const unitPrice = minorToMajor(apiItem.unit_price_minor);
  const offerUnitPrice =
    offerFromPricing != null && offerFromPricing > 0
      ? offerFromPricing
      : apiItem.offer_price_minor_per_unit !== undefined &&
          apiItem.offer_price_minor_per_unit !== null
        ? minorToMajor(apiItem.offer_price_minor_per_unit)
        : null;

  if (isBundleReward) {
    return {
      effectiveUnitPrice: 0,
      originalPrice: null,
      lineTotal: 0,
    };
  }

  const paidQty = Math.max(
    1,
    Number(apiItem.paid_quantity ?? apiItem.paidQuantity ?? apiItem.billable_quantity ?? apiItem.billableQuantity ?? quantity) ||
      quantity
  );

  let lineTotal = minorToMajor(lineTotalMinor);
  if (!(lineTotal > 0) && finalPerUnitMinor > 0) {
    lineTotal = minorToMajor(finalPerUnitMinor) * paidQty;
  }
  if (!(lineTotal > 0) && offerUnitPrice != null && offerUnitPrice > 0) {
    lineTotal = offerUnitPrice * quantity;
  }
  if (!(lineTotal > 0)) {
    lineTotal = unitPrice * quantity;
  }

  let effectiveUnitPrice = paidQty > 0 ? lineTotal / paidQty : lineTotal / Math.max(1, quantity);
  if (!(effectiveUnitPrice > 0) && finalPerUnitMinor > 0) {
    effectiveUnitPrice = minorToMajor(finalPerUnitMinor);
  }
  if (!(effectiveUnitPrice > 0) && offerUnitPrice != null && offerUnitPrice > 0) {
    effectiveUnitPrice = offerUnitPrice;
  }
  if (!(effectiveUnitPrice > 0)) {
    effectiveUnitPrice = unitPrice;
  }

  let originalPrice = null;
  if (listPerUnitMinor > 0) {
    const listUnit = minorToMajor(listPerUnitMinor);
    if (listUnit > effectiveUnitPrice + 1e-9) originalPrice = listUnit;
  }
  if (
    originalPrice == null &&
    offerUnitPrice != null &&
    offerUnitPrice > effectiveUnitPrice + 1e-9
  ) {
    originalPrice = offerUnitPrice;
  }
  if (originalPrice == null && unitPrice > effectiveUnitPrice + 1e-9) {
    originalPrice = unitPrice;
  }

  return { effectiveUnitPrice, originalPrice, lineTotal };
}

/**
 * Transform API cart item to frontend format
 */
function transformCartItem(apiItem, product = null) {
  if (!apiItem) return null;

  const normalized = normalizeStorefrontCartItemRaw(apiItem);
  const isBundleReward = isBundleRewardCartLine(normalized);
  const qtyFields = readCartLineQuantityFields(normalized);
  const billableQty = qtyFields.billable;
  const paidQty = qtyFields.paid;
  const freeQty = qtyFields.free;
  const displayQty = qtyFields.display;
  const rawQty = Number(normalized.quantity ?? 1) || 1;

  const quantity = isBundleReward
    ? rawQty
    : Number.isFinite(paidQty) && paidQty > 0
      ? paidQty
      : Number.isFinite(billableQty) && billableQty > 0
        ? billableQty
        : rawQty;

  const { effectiveUnitPrice, originalPrice, lineTotal } = resolveCartLinePricing(
    normalized,
    quantity,
    isBundleReward
  );

  const nestedProduct =
    product ||
    (normalized.product && typeof normalized.product === 'object' ? normalized.product : null) ||
    (normalized.product_snapshot && typeof normalized.product_snapshot === 'object'
      ? normalized.product_snapshot
      : null);

  const lineImageUrls = resolveCartLineImageUrls(normalized);
  const fromNestedGallery =
    nestedProduct != null
      ? getResolvedProductImageUrls(nestedProduct).filter((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER)
      : [];

  const imagesList = [...new Set([...lineImageUrls, ...fromNestedGallery])];
  const primaryImage = imagesList[0] || PRODUCT_IMAGE_PLACEHOLDER;

  const productId = normalized.product_id || normalized.productId || nestedProduct?.id;
  const unitLabel = String(normalized.unit_label ?? normalized.unit ?? normalized.unitLabel ?? '').trim();
  const sizeKey = unitLabel || 'default';
  const cartItemKey = isBundleReward
    ? String(normalized.id ?? '')
    : `${productId ?? 'item'}_${sizeKey}`;

  const promo = normalized.promo && typeof normalized.promo === 'object' ? normalized.promo : null;
  const promoIds =
    promo?.promotion_ids ??
    normalized.applied_promotion_ids ??
    normalized.appliedPromotionIds ??
    [];

  return {
    id: normalized.id,
    cartItemId: normalized.id,
    cartItemKey,
    paidCartItemId: getPaidCartItemId(normalized),
    product: nestedProduct,
    productId,
    quantity,
    displayQuantity: Number.isFinite(displayQty) && displayQty > 0 ? displayQty : quantity,
    freeQuantity: Number.isFinite(freeQty) && freeQty > 0 ? freeQty : 0,
    isBundleReward,
    bundleSourceCartItemId:
      normalized.bundle_source_item_id ??
      normalized.bundle_source_cart_item_id ??
      normalized.bundleSourceItemId ??
      normalized.bundleSourceCartItemId ??
      null,
    price: effectiveUnitPrice,
    originalPrice,
    lineTotal,
    promoDiscountMinor: parseMinorInt(
      normalized.promo_discount_minor ?? normalized.promoDiscountMinor
    ),
    totalDiscountMinor: parseMinorInt(
      normalized.total_discount_minor ?? normalized.totalDiscountMinor
    ),
    appliedPromotionIds: Array.isArray(promoIds) ? promoIds : [],
    promoTypes: Array.isArray(promo?.types) ? promo.types : [],
    priceUpdated: !!(normalized.price_updated ?? normalized.priceUpdated),
    previousUnitPriceMinor: parseMinorInt(
      normalized.previous_unit_price_minor ?? normalized.previousUnitPriceMinor
    ),
    total: lineTotal,
    name: nestedProduct?.name || normalized.title_snapshot || normalized.title || '',
    productSlug: normalized.product_slug ?? normalized.slug ?? normalized.productSlug ?? null,
    unitLabel: normalized.unit_label ?? normalized.unit ?? normalized.unitLabel ?? '',
    image: primaryImage,
    images: imagesList,
    globalImageUrl: normalized.global_image_url ?? normalized.globalImageUrl ?? null,
    imageUrl: normalized.image_url ?? normalized.imageUrl ?? null,
    thumbnailUrl: normalized.thumbnail_url ?? normalized.thumbnail ?? null,
    stock: nestedProduct?.stock || 0,
    inStock: nestedProduct?.inStock ?? true,
    unit: nestedProduct?.unit || normalized.unit_label || normalized.unit || '',
    weight: nestedProduct?.weight || null,
    sizeDisplay: (() => {
      const label = normalized.unit_label ?? normalized.unit ?? normalized.unitLabel ?? '';
      if (!label) return nestedProduct?.sizeDisplay || '';
      if (isBundleReward) return `${quantity} ${label} · Free`;
      const showQty =
        Number.isFinite(displayQty) && displayQty > quantity ? displayQty : quantity;
      const freeExtra =
        Number.isFinite(displayQty) && displayQty > quantity ? displayQty - quantity : 0;
      if (freeExtra > 0) {
        return `${showQty} ${label} (${freeExtra} free)`;
      }
      return `${quantity} ${label}`;
    })(),
    originalProduct: nestedProduct || null,
  };
}

const EMPTY_CART = { items: [], subtotal: 0, total: 0 };

/**
 * Normalize `StorefrontCartResponse` from GET/POST/PATCH/DELETE cart endpoints.
 */
function parseStorefrontCartResponse(response) {
  if (!response || typeof response !== 'object') return { ...EMPTY_CART };

  const itemsRaw = Array.isArray(response.items) ? response.items : [];
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

  const summary = response.summary || {};
  const subtotalMinor = parseMinorInt(summary.subtotal_minor ?? summary.subtotalMinor);
  const subtotalBeforeCouponMinor = parseMinorInt(
    summary.subtotal_before_coupon_minor ?? summary.subtotalBeforeCouponMinor
  );
  const couponDiscountMinor = parseMinorInt(
    summary.coupon_discount_minor ?? summary.couponDiscountMinor
  );
  const bundleDiscountMinor = parseMinorInt(
    summary.bundle_discount_minor ?? summary.bundleDiscountMinor
  );
  const subtotalFromSummary = minorToMajor(summary.total_price_minor);
  const totalOffer = minorToMajor(summary.total_offer_price_minor);
  const payableFromLines = items.reduce((sum, it) => {
    if (it.isBundleReward) return sum;
    const line = Number(it.lineTotal);
    if (Number.isFinite(line) && line >= 0) return sum + line;
    return sum + (Number(it.price) || 0) * (Number(it.quantity) || 0);
  }, 0);
  const subtotal =
    subtotalMinor > 0
      ? minorToMajor(subtotalMinor)
      : totalOffer > 0
        ? totalOffer
        : payableFromLines > 0
          ? payableFromLines
          : subtotalFromSummary;
  const total = subtotalMinor > 0 ? minorToMajor(subtotalMinor) : subtotal;

  const displayUnitsTotal = parseMinorInt(
    summary.units_display_total ??
      summary.display_units_total ??
      summary.displayUnitsTotal
  );
  const resolvedDisplayUnits =
    displayUnitsTotal > 0 ? displayUnitsTotal : sumCartDisplayUnits(items);

  const eligibilityMinor =
    subtotalBeforeCouponMinor > 0
      ? subtotalBeforeCouponMinor
      : subtotalMinor > 0
        ? subtotalMinor
        : Math.round(subtotal * 100);

  const promotions = normalizeCartPromotions(response.promotions);

  return {
    cartId: response.cartId ?? response.cart_id ?? null,
    items,
    subtotal,
    total,
    subtotalMinor: subtotalMinor > 0 ? subtotalMinor : Math.round(subtotal * 100),
    subtotalBeforeCouponMinor: eligibilityMinor,
    couponDiscountMinor,
    bundleDiscountMinor,
    discount: minorToMajor(summary.total_discount_minor),
    promotionDiscountMinor: parseMinorInt(
      summary.promotion_discount_minor ?? summary.promotionDiscountMinor
    ),
    linePromoDiscountMinor: parseMinorInt(
      summary.line_promo_discount_minor ?? summary.linePromoDiscountMinor
    ),
    displayUnitsTotal: resolvedDisplayUnits,
    currency: summary.currency || 'INR',
    promotions,
  };
}

/**
 * Get current user's cart with live promos; optional coupon preview (not persisted until checkout).
 *
 * @param {{ couponCode?: string }} [options]
 * @returns {Promise<object>}
 */
export async function getCart(options = {}) {
  try {
    const shopId = await resolveShopId();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    const couponCode = String(options.couponCode || '').trim();
    const query = couponCode ? { couponCode } : undefined;

    await ensureCartExists(shopId);
    const response = await apiFetchRoot('/storefront/cart', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      query,
    });

    return parseStorefrontCartResponse(response);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return { ...EMPTY_CART };
  }
}

/**
 * Add product to cart (relative `delta`; merges if product already in cart).
 *
 * @param {string|object} productInput - Product UUID or product-like object
 * @param {number} delta - Units to add (positive integer)
 * @param {{ couponCode?: string }} [options] - Optional coupon preview on response
 * @returns {Promise<object>} Full repriced cart (`StorefrontCartResponse` shape)
 */
export async function addToCart(productInput, delta = 1, options = {}) {
  try {
    const productId = await resolveProductIdForCart(productInput);
    if (!productId) {
      throw new Error('Invalid productId for cart API (must be UUID).');
    }
    const safeDelta = Math.max(1, Math.floor(Number(delta) || 1));

    const shopId = await resolveShopId();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    await ensureCartExists(shopId);

    const body = { productId, delta: safeDelta };
    const couponCode = String(options.couponCode || '').trim();
    if (couponCode) body.couponCode = couponCode;

    const response = await apiFetchRoot('/storefront/cart/items', {
      method: 'POST',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body,
    });

    return parseStorefrontCartResponse(response);
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

/**
 * Update cart line quantity via relative `delta` (preferred) or absolute `quantity`.
 *
 * @param {string} itemId - Paid cart line UUID (not `:bundle-reward`)
 * @param {number|null|undefined} quantity - Absolute quantity (legacy); omit when using `delta`
 * @param {{ delta?: number, couponCode?: string }} [options]
 * @returns {Promise<object>} Full repriced cart
 */
export async function updateCartItem(itemId, quantity, options = {}) {
  if (isBundleRewardCartLineId(itemId)) {
    throw new Error('Cannot change quantity on a free bundle item.');
  }
  try {
    const shopId = await resolveShopId();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    const body = {};
    if (options.delta != null && Number.isFinite(Number(options.delta))) {
      const d = Math.trunc(Number(options.delta));
      if (d === 0) {
        throw new Error('Cart quantity delta must be non-zero.');
      }
      body.delta = d;
    } else if (quantity != null && Number.isFinite(Number(quantity))) {
      body.quantity = Math.max(1, Number(quantity) || 1);
    } else {
      throw new Error('Provide delta or quantity for cart item update.');
    }

    const couponCode = String(options.couponCode || '').trim();
    if (couponCode) body.couponCode = couponCode;

    const response = await apiFetchRoot(`/storefront/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body,
    });

    return parseStorefrontCartResponse(response);
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
}

/**
 * Remove item from cart
 * @param {string} itemId - Cart item UUID
 * @param {{ couponCode?: string }} [options]
 * @returns {Promise<object>} Full repriced cart
 */
export async function removeFromCart(itemId, options = {}) {
  if (isBundleRewardCartLineId(itemId)) {
    throw new Error('Cannot remove a free bundle item directly.');
  }
  try {
    const shopId = await resolveShopId();
    if (!shopId) {
      throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/* requests on localhost).');
    }

    const body = {};
    const couponCode = String(options.couponCode || '').trim();
    if (couponCode) body.couponCode = couponCode;

    const response = await apiFetchRoot(`/storefront/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body: Object.keys(body).length ? body : undefined,
    });

    return parseStorefrontCartResponse(response);
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
    const paidLines = (cart.items || []).filter((it) => !it.isBundleReward);
    await Promise.all(paidLines.map((it) => removeFromCart(it.cartItemId || it.id)));
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
