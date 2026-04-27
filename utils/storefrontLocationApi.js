/**
 * Storefront delivery location (POST /storefront/location/check)
 */

import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ serviceable: boolean, distanceM: number | null, maxRadiusM: number | null }>}
 */
export async function checkDeliveryLocation(lat, lng) {
  const shopId = await resolveShopId();
  if (!shopId) {
    const err = new Error('Missing NEXT_PUBLIC_SHOP_ID');
    err.code = 'MISSING_SHOP_ID';
    throw err;
  }

  const raw = await apiFetchRoot('/storefront/location/check', {
    method: 'POST',
    body: { lat, lng },
    headers: { 'x-shop-id': shopId },
    omitTenantHeader: true,
  });

  const data = raw && typeof raw === 'object' && 'serviceable' in raw ? raw : raw?.data || {};
  return {
    serviceable: !!data.serviceable,
    distanceM: typeof data.distanceM === 'number' ? data.distanceM : null,
    maxRadiusM: typeof data.maxRadiusM === 'number' ? data.maxRadiusM : null,
  };
}
