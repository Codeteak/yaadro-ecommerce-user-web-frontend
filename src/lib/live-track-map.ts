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
