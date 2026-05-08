/**
 * Haversine distance between two WGS84 points.
 * @returns {number} distance in kilometres
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const r = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

/** Human-readable distance (m if under 1 km, else km). */
export function formatDistanceKm(km) {
  if (!Number.isFinite(km) || km < 0) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Rough last-mile ETA: travel time at avgUrbanKmh plus a fixed buffer (minutes).
 * Tune via env or constants for your ops team.
 */
export function estimateDeliveryMinutes(distanceKmFromStore, options = {}) {
  const bufferMin = Number(options.bufferMin ?? 10);
  const avgUrbanKmh = Number(options.avgUrbanKmh ?? 22);
  if (!Number.isFinite(distanceKmFromStore) || distanceKmFromStore < 0) {
    return Math.max(1, Math.ceil(bufferMin));
  }
  const travelMin = (distanceKmFromStore / avgUrbanKmh) * 60;
  return Math.max(1, Math.ceil(travelMin + bufferMin));
}
