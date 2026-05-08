// Lightweight Nominatim (OpenStreetMap) geocoder helpers.
//
// IMPORTANT — Usage policy:
//   • The public endpoint at https://nominatim.openstreetmap.org is rate-limited
//     to ~1 request/second and an identifying User-Agent / email is REQUIRED.
//   • For any non-trivial production traffic you MUST self-host Nominatim or
//     switch to LocationIQ / OpenCage / Mapbox. Just point
//     `NEXT_PUBLIC_NOMINATIM_URL` at your provider — same response shape.

const NOMINATIM_URL = (
  process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
).replace(/\/+$/, '');

// Trim is important — a trailing space on `NEXT_PUBLIC_GEOCODING_API_KEY` would
// otherwise be encoded as `%20` and cause a 401/400 from LocationIQ.
const NOMINATIM_EMAIL = (process.env.NEXT_PUBLIC_NOMINATIM_EMAIL || '').trim();
const GEOCODING_API_KEY = (process.env.NEXT_PUBLIC_GEOCODING_API_KEY || '').trim();
const COUNTRY_BIAS = (process.env.NEXT_PUBLIC_GEOCODING_COUNTRY || 'in').toLowerCase();

// When an API key is configured we're talking to a paid provider
// (LocationIQ / OpenCage / etc.) which:
//   • does NOT accept `format=jsonv2` (only Nominatim does — they want plain `json`)
//   • does NOT expect the OSM `email=` usage-policy parameter
const USE_API_PROVIDER = Boolean(GEOCODING_API_KEY);
const RESPONSE_FORMAT = USE_API_PROVIDER ? 'json' : 'jsonv2';

function buildHeaders() {
  // Browsers control User-Agent, so we don't set it. Nominatim's other identity
  // hint is the `email=` query param, which we add in `appendCredentials`.
  return { 'Accept-Language': 'en' };
}

function appendCredentials(url) {
  let result = url;
  // Drop-in support for LocationIQ / OpenCage / self-hosted Nominatim that
  // requires `key=…` (e.g. `https://us1.locationiq.com/v1/reverse`).
  if (GEOCODING_API_KEY) {
    const sep = result.includes('?') ? '&' : '?';
    result = `${result}${sep}key=${encodeURIComponent(GEOCODING_API_KEY)}`;
  }
  // Only attach the OSM-policy email when hitting a Nominatim endpoint —
  // LocationIQ / OpenCage reject unknown params with HTTP 400.
  if (NOMINATIM_EMAIL && !USE_API_PROVIDER) {
    const sep = result.includes('?') ? '&' : '?';
    result = `${result}${sep}email=${encodeURIComponent(NOMINATIM_EMAIL)}`;
  }
  return result;
}

/**
 * Reverse geocode a (lat, lng) into a structured address.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{ signal?: AbortSignal, zoom?: number }} [opts]
 * @returns {Promise<null | {
 *   line1: string,
 *   line2: string,
 *   landmark: string,
 *   city: string,
 *   state: string,
 *   postalCode: string,
 *   country: string,
 *   displayName: string,
 *   raw: object,
 * }>}
 */
export async function reverseGeocode(lat, lng, opts = {}) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  const zoom = opts.zoom ?? 18;
  const url = appendCredentials(
    `${NOMINATIM_URL}/reverse?format=${RESPONSE_FORMAT}&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1`
  );

  const res = await fetch(url, { headers: buildHeaders(), signal: opts.signal });
  if (!res.ok) throw new Error(`Reverse geocode failed (HTTP ${res.status})`);
  const data = await res.json();
  if (!data || !data.address) return null;

  const a = data.address;

  const line1Parts = [
    a.house_number,
    a.building,
    a.road || a.pedestrian || a.footway || a.path,
  ].filter(Boolean);

  const line2Parts = [
    a.neighbourhood,
    a.suburb,
    a.quarter,
    a.hamlet,
    a.village,
  ].filter(Boolean);

  return {
    line1: line1Parts.join(' ').trim(),
    line2: [...new Set(line2Parts)].slice(0, 2).join(', ').trim(),
    landmark: a.amenity || a.tourism || a.shop || '',
    city:
      a.city ||
      a.town ||
      a.municipality ||
      a.county ||
      a.district ||
      a.state_district ||
      '',
    state: a.state || a.region || '',
    postalCode: a.postcode || '',
    country: a.country || '',
    displayName: data.display_name || '',
    raw: data,
  };
}

/**
 * Forward geocode a free-text query → list of candidate places.
 *
 * @param {string} q
 * @param {{ signal?: AbortSignal, limit?: number }} [opts]
 * @returns {Promise<Array<{
 *   lat: number,
 *   lng: number,
 *   displayName: string,
 *   raw: object,
 * }>>}
 */
export async function forwardGeocode(q, opts = {}) {
  const trimmed = String(q || '').trim();
  if (!trimmed) return [];
  const limit = Math.max(1, Math.min(10, Number(opts.limit) || 5));
  const params = new URLSearchParams({
    format: RESPONSE_FORMAT,
    addressdetails: '1',
    q: trimmed,
    limit: String(limit),
  });
  if (COUNTRY_BIAS) params.set('countrycodes', COUNTRY_BIAS);

  const url = appendCredentials(`${NOMINATIM_URL}/search?${params.toString()}`);

  const res = await fetch(url, { headers: buildHeaders(), signal: opts.signal });
  if (!res.ok) throw new Error(`Forward geocode failed (HTTP ${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lon),
      displayName: item.display_name || '',
      raw: item,
    }))
    .filter((it) => Number.isFinite(it.lat) && Number.isFinite(it.lng));
}

/** Default map center if neither GPS nor saved coordinates are available. */
export function getDefaultMapCenter() {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER || '12.9716,77.5946';
  const [a, b] = String(raw).split(',').map((s) => Number(String(s).trim()));
  if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lng: b };
  return { lat: 12.9716, lng: 77.5946 };
}
