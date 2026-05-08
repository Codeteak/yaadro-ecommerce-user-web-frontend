import { getDefaultMapCenter } from './geocoding';

/**
 * Physical store / fulfilment centre coordinates for distance & ETA on the map.
 *
 * Set in `.env.local`:
 *   NEXT_PUBLIC_STORE_LAT=12.xxxx
 *   NEXT_PUBLIC_STORE_LNG=77.xxxx
 *
 * If omitted, falls back to `NEXT_PUBLIC_DEFAULT_MAP_CENTER` (same as map default).
 */
export function getStoreCoordinates() {
  const lat = Number(process.env.NEXT_PUBLIC_STORE_LAT);
  const lng = Number(process.env.NEXT_PUBLIC_STORE_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return getDefaultMapCenter();
}
