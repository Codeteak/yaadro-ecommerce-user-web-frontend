import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';

function minorToMajor(minor) {
  const n = Number(minor ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

/**
 * Place order for current authenticated customer.
 *
 * Endpoint: POST /storefront/checkout
 * Auth: Bearer JWT (handled by apiFetchRoot)
 * Shop context: x-shop-id required
 */
export async function placeStorefrontOrder({ addressId, notes }) {
  const shopId = await resolveShopId();
  if (!shopId) {
    throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for /storefront/checkout).');
  }
  if (!addressId) {
    throw new Error('addressId is required.');
  }

  const body = {
    addressId,
    ...(notes ? { notes } : {}),
  };

  const res = await apiFetchRoot('/storefront/checkout', {
    method: 'POST',
    headers: { 'x-shop-id': shopId },
    omitTenantHeader: true,
    body,
  });

  return {
    orderId: res?.orderId,
    orderNumber: res?.orderNumber,
    total: minorToMajor(res?.total_minor),
    total_minor: res?.total_minor ?? 0,
  };
}

