import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { getApiErrorCode } from './apiErrors';
import { minorToMajor } from './currencyMinor';

async function ensureCartExists(shopId) {
  try {
    await apiFetchRoot('/storefront/cart', {
      method: 'POST',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });
  } catch {
    // ignore (checkout will surface real errors)
  }
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `checkout-${crypto.randomUUID()}`;
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function attachApiErrorCode(err) {
  const code = getApiErrorCode(err);
  if (code) err.code = code;
  return err;
}

/**
 * Place order for current authenticated customer.
 *
 * Endpoint: POST /storefront/checkout
 * Apply coupon: pass `couponCode` (trimmed, uppercased server-side).
 */
export async function placeStorefrontOrder({ notes, couponCode, idempotencyKey } = {}) {
  const shopId = await resolveShopId();
  if (!shopId) {
    throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/checkout).');
  }

  await ensureCartExists(shopId);

  const body = {};
  if (notes) body.notes = notes;
  const trimmedCode = String(couponCode || '').trim();
  if (trimmedCode) body.couponCode = trimmedCode;

  const headers = {
    'x-shop-id': shopId,
    'Idempotency-Key': idempotencyKey || createIdempotencyKey(),
  };

  let res;
  try {
    res = await apiFetchRoot('/storefront/checkout', {
      method: 'POST',
      headers,
      omitTenantHeader: true,
      body,
    });
  } catch (err) {
    throw attachApiErrorCode(err);
  }

  return {
    orderId: res?.orderId,
    orderNumber: res?.orderNumber,
    subtotal: minorToMajor(res?.subtotal_minor),
    subtotal_minor: res?.subtotal_minor ?? 0,
    promotionDiscount: minorToMajor(res?.promotion_discount_minor),
    promotion_discount_minor: res?.promotion_discount_minor ?? 0,
    couponDiscount: minorToMajor(res?.coupon_discount_minor),
    coupon_discount_minor: res?.coupon_discount_minor ?? 0,
    deliveryFee: minorToMajor(res?.delivery_fee_minor),
    delivery_fee_minor: res?.delivery_fee_minor ?? 0,
    total: minorToMajor(res?.total_minor),
    total_minor: res?.total_minor ?? 0,
    couponCode: res?.coupon_code ?? res?.couponCode ?? null,
  };
}
