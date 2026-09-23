/**
 * Pure storefront address helpers (no API client imports — safe for node:test).
 */

/**
 * Delivery notes only — drop geocode objects / JSON dumps stored in `raw`.
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeAddressNotes(raw) {
  if (raw == null) return '';
  if (typeof raw === 'object') return '';
  const text = String(raw).trim();
  if (!text || text === '[object Object]') return '';
  if (text.startsWith('{') || text.startsWith('[')) return '';
  return text;
}

/**
 * Build POST body for storefront address (no state / PIN / country).
 * @param {object} addressData
 */
export function toStorefrontAddressBody(addressData) {
  const notes = sanitizeAddressNotes(addressData?.raw);
  return {
    line1: addressData?.line1 || addressData?.street || addressData?.address || '',
    line2: addressData?.line2 || '',
    landmark: addressData?.landmark || '',
    city: addressData?.city || '',
    lat: addressData?.lat ?? null,
    lng: addressData?.lng ?? null,
    raw: notes || null,
  };
}

/**
 * Build PATCH body for storefront address (only defined kept fields).
 * @param {object} addressData
 */
export function toStorefrontAddressPatch(addressData) {
  const apiData = {};
  if (addressData.street !== undefined || addressData.address !== undefined) {
    apiData.line1 = addressData.street || addressData.address || '';
  }
  if (addressData.line1 !== undefined) apiData.line1 = addressData.line1;
  if (addressData.line2 !== undefined) apiData.line2 = addressData.line2;
  if (addressData.city !== undefined) apiData.city = addressData.city;
  if (addressData.landmark !== undefined) apiData.landmark = addressData.landmark;
  if (addressData.lat !== undefined) apiData.lat = addressData.lat;
  if (addressData.lng !== undefined) apiData.lng = addressData.lng;
  if (addressData.raw !== undefined) {
    apiData.raw = sanitizeAddressNotes(addressData.raw) || null;
  }
  return apiData;
}
