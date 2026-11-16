/**
 * Real device pin for POST /api/storefront/location/check.
 * A missing pin is asked for again. Coordinates are never invented.
 */

export type LatLng = { lat: number; lng: number };

export function isLatLng(
  value: { lat?: number | null; lng?: number | null } | null | undefined,
): value is LatLng {
  if (!value) return false;
  const { lat, lng } = value;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Calls `readOnce` until it returns a real pin or the attempt budget runs out.
 * Each call is a fresh browser prompt when the previous one was dismissed.
 */
export async function askUntilLocation(
  readOnce: () => Promise<LatLng | null>,
  attempts = 3,
): Promise<LatLng | null> {
  const tries = Math.max(1, Math.floor(attempts));
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const point = await readOnce();
    if (isLatLng(point)) return { lat: point.lat, lng: point.lng };
  }
  return null;
}

export function readBrowserPosition(): Promise<LatLng | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        resolve(isLatLng(point) ? point : null);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
}

/** Null when the shop can deliver. Otherwise the sentence to show. */
export function deliveryAreaBlock(result: { serviceable?: boolean } | null): string | null {
  if (!result || result.serviceable !== true) {
    if (result && result.serviceable === false) return "We don't deliver to that location yet.";
    return "We couldn't check delivery for that location. Try again.";
  }
  return null;
}
