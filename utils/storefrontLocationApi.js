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

function parseFiniteNumber(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function parseShopLocation(data) {
  if (!data || typeof data !== 'object') return null;
  const loc = data.shopLocation ?? data.shop_location ?? data.shop;
  if (!loc || typeof loc !== 'object') return null;
  const lat = parseFiniteNumber(loc.lat ?? loc.latitude);
  const lng = parseFiniteNumber(loc.lng ?? loc.longitude ?? loc.lon);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function parseMaxRadiusM(data) {
  if (!data || typeof data !== 'object') return null;
  const meters = parseFiniteNumber(
    data.maxRadiusM ?? data.max_radius_m ?? data.radiusM ?? data.radius_m,
  );
  if (meters != null && meters > 0) return meters;
  const km = parseFiniteNumber(
    data.maxRadiusKm ?? data.max_radius_km ?? data.radiusKm ?? data.radius_km,
  );
  if (km != null && km > 0) return km * 1000;
  return null;
}

function parseDistanceM(data) {
  if (!data || typeof data !== 'object') return null;
  const meters = parseFiniteNumber(data.distanceM ?? data.distance_m);
  if (meters != null) return meters;
  const km = parseFiniteNumber(data.distanceKm ?? data.distance_km);
  if (km != null) return km * 1000;
  return null;
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
    distanceM: parseDistanceM(data),
    maxRadiusM: parseMaxRadiusM(data),
    shopLocation: parseShopLocation(data),
    apiPayload: data && typeof data === 'object' ? data : {},
  };
}
