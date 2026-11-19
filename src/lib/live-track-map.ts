/**
 * Live-track map helpers. Uses the same public Maps key as address detect
 * (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). Embed API must be enabled on the key.
 */

export type LiveMapPoint = {
  lat: number;
  lng: number;
  label?: string;
};

/** Sample shop → delivery points for playground (Bengaluru area). */
export const SAMPLE_LIVE_MAP = {
  origin: { lat: 12.891, lng: 77.641, label: "Shop" } satisfies LiveMapPoint,
  destination: {
    lat: 12.877,
    lng: 77.632,
    label: "Delivery",
  } satisfies LiveMapPoint,
};

export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : null;
}

/** Default map centre when the shopper has not picked a pin yet (Bengaluru). */
export const DEFAULT_MAP_CENTER = {
  lat: 12.9716,
  lng: 77.5946,
} as const;

/** Google Maps Embed directions URL, or null when key is missing. */
export function buildLiveTrackEmbedUrl(opts: {
  origin: LiveMapPoint;
  destination: LiveMapPoint;
  mode?: "driving" | "walking" | "bicycling";
}): string | null {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    key,
    origin: `${opts.origin.lat},${opts.origin.lng}`,
    destination: `${opts.destination.lat},${opts.destination.lng}`,
    mode: opts.mode ?? "driving",
  });

  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}

/** Place preview embed for a fixed lat/lng (details mini-map). */
export function buildPlaceEmbedUrl(lat: number, lng: number, zoom = 16): string | null {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    key,
    q: `${lat},${lng}`,
    zoom: String(zoom),
  });

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}
