/**
 * Storefront delivery location (POST /storefront/location/check)
 *
 * Sets httpOnly `storefront_serviceability` cookie (production). Requires
 * `credentials: 'include'` on fetch — handled by apiFetchRoot for /storefront/*.
 */

import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';

function unwrapLocationCheckData(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if ('serviceable' in raw || 'inServiceArea' in raw || 'in_service_area' in raw) return raw;
  if (raw.data && typeof raw.data === 'object') return raw.data;
  return raw;
}

/** Normalize API variants → boolean serviceable. */
export function parseLocationServiceable(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.serviceable === true || data.serviceable === 'true') return true;
  if (data.serviceable === false || data.serviceable === 'false') return false;
  if (data.inServiceArea === true || data.in_service_area === true) return true;
  if (data.inServiceArea === false || data.in_service_area === false) return false;
  return false;
}

/**
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{
 *   serviceable: boolean,
 *   distanceM: number | null,
 *   maxRadiusM: number | null,
 *   shopLocation: { lat: number, lng: number } | null,
 *   apiPayload: object
 * }>}
 */
export async function checkDeliveryLocation(lat, lng) {
  const shopId = await resolveShopId();
  if (!shopId) {
    const err = new Error('Missing NEXT_PUBLIC_SHOP_ID');
    err.code = 'MISSING_SHOP_ID';
    throw err;
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  const raw = await apiFetchRoot('/storefront/location/check', {
    method: 'POST',
    credentials: 'include',
    body: { lat: latNum, lng: lngNum },
    headers: { 'x-shop-id': shopId },
    omitTenantHeader: true,
  });

  const data = unwrapLocationCheckData(raw);
  const serviceable = parseLocationServiceable(data);

  return {
    serviceable,
    distanceM:
      typeof data.distanceM === 'number'
        ? data.distanceM
        : typeof data.distance_m === 'number'
          ? data.distance_m
          : null,
    maxRadiusM:
      typeof data.maxRadiusM === 'number'
        ? data.maxRadiusM
        : typeof data.max_radius_m === 'number'
          ? data.max_radius_m
          : null,
    shopLocation: parseShopLocation(data),
    apiPayload: data && typeof data === 'object' ? data : {},
  };
}
