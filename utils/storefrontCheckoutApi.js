import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { getApiErrorCode } from './apiErrors';
import { minorToMajor } from './currencyMinor';
import { checkDeliveryLocation } from './storefrontLocationApi';

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
 * Place order for the authenticated customer (COD).
 *
 * Checkout JSON ignores lat/lng/addressId. Delivery is the saved profile address.
 * Call location/check with that pin first so the httpOnly `storefront_serviceability`
 * cookie is set (`credentials: include` on /storefront/*).
 */
export async function placeStorefrontOrder({
  notes,
  couponCode,
  items,
  idempotencyKey,
  lat,
  lng,
} = {}) {
  const shopId = await resolveShopId();
  if (!shopId) {
    throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/checkout).');
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    const err = new Error('Delivery address must include a map location.');
    err.code = 'ADDRESS_COORDINATES_REQUIRED';
    throw err;
  }

  const delivery = await checkDeliveryLocation(latNum, lngNum);
  if (!delivery.serviceable) {
    const err = new Error('Delivery is not available for this address.');
    err.code = 'ADDRESS_NOT_SERVICEABLE';
    throw err;
  }

  const body = {};
  if (notes) body.notes = notes;
  const trimmedCode = String(couponCode || '').trim();
  if (trimmedCode) body.couponCode = trimmedCode;
  const checkoutItems = Array.isArray(items)
    ? items
        .map((it) => ({
          productId: String(it?.productId ?? it?.product_id ?? ''),
          quantity: Number(it?.quantity) || 1,
        }))
        .filter((it) => it.productId && it.quantity > 0)
    : [];
  if (checkoutItems.length) body.items = checkoutItems;

  const headers = {
    'x-shop-id': shopId,
    'Idempotency-Key': idempotencyKey || createIdempotencyKey(),
  };

  let res;
  try {
    res = await apiFetchRoot('/storefront/checkout', {
      method: 'POST',
      credentials: 'include',
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
