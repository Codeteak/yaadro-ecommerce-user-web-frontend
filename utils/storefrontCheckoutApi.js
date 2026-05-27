import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import { getApiErrorCode } from './apiErrors';
import { minorToMajor } from './currencyMinor';
import { checkDeliveryLocation } from './storefrontLocationApi';
import { logCheckoutDebug, logCheckoutFailure } from './checkoutDebugLog';

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
 * Delivery pin: pass `lat` / `lng` from the selected address (not device GPS).
 */
export async function placeStorefrontOrder({
  notes,
  couponCode,
  idempotencyKey,
  lat,
  lng,
  addressId,
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

  const checkoutContext = {
    shopId,
    lat: latNum,
    lng: lngNum,
    addressId: addressId != null ? String(addressId).trim() : null,
    couponCode: String(couponCode || '').trim() || null,
    hasNotes: Boolean(notes && String(notes).trim()),
  };

  let delivery;
  try {
    delivery = await checkDeliveryLocation(latNum, lngNum);
  } catch (locationErr) {
    logCheckoutFailure('location-check', checkoutContext, locationErr);
    throw attachApiErrorCode(locationErr);
  }

  logCheckoutDebug('location-check-ok', {
    ...checkoutContext,
    delivery: {
      serviceable: delivery.serviceable,
      distanceM: delivery.distanceM,
      maxRadiusM: delivery.maxRadiusM,
      apiPayload: delivery.apiPayload,
    },
  });

  if (!delivery.serviceable) {
    const err = new Error('Delivery is not available for this address.');
    err.code = 'ADDRESS_NOT_SERVICEABLE';
    logCheckoutFailure('location-not-serviceable', { ...checkoutContext, delivery }, err);
    throw err;
  }

  await ensureCartExists(shopId);

  const body = { lat: latNum, lng: lngNum };
  if (notes) body.notes = notes;
  const trimmedCode = String(couponCode || '').trim();
  if (trimmedCode) body.couponCode = trimmedCode;
  if (addressId != null && String(addressId).trim()) {
    body.addressId = String(addressId).trim();
  }

  const headers = {
    'x-shop-id': shopId,
    'Idempotency-Key': idempotencyKey || createIdempotencyKey(),
  };

  logCheckoutDebug('checkout-request', {
    ...checkoutContext,
    endpoint: 'POST /storefront/checkout',
    requestBody: body,
    requestHeaders: { 'x-shop-id': shopId, 'Idempotency-Key': '(set)' },
    deliveryCheckBeforeCheckout: {
      serviceable: delivery.serviceable,
      distanceM: delivery.distanceM,
      maxRadiusM: delivery.maxRadiusM,
      apiPayload: delivery.apiPayload,
    },
  });

  let res;
  try {
    res = await apiFetchRoot('/storefront/checkout', {
      method: 'POST',
      headers,
      omitTenantHeader: true,
      body,
    });
  } catch (err) {
    logCheckoutFailure('checkout-api', { ...checkoutContext, requestBody: body, delivery }, err);
    throw attachApiErrorCode(err);
  }

  logCheckoutDebug('checkout-success', {
    ...checkoutContext,
    orderId: res?.orderId,
    orderNumber: res?.orderNumber,
  });

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
