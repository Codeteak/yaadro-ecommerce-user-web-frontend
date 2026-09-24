/**
 * Delivery location check helpers for checkout / address UX.
 * Does not change shop radius or serviceability business rules —
 * only interprets checkDeliveryLocation results for the customer.
 */

import { checkDeliveryLocation } from './storefrontLocationApi.js';
import { classifyDeliveryCheckResult } from './apiErrors.js';

/**
 * @param {number|null|undefined} lat
 * @param {number|null|undefined} lng
 * @returns {Promise<{
 *   ok: boolean,
 *   kind: string,
 *   title: string,
 *   message: string,
 *   tone: 'error' | 'warning' | 'info',
 *   result: object | null,
 *   error: Error | null
 * }>}
 */
export async function verifyDeliveryAtCoords(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return {
      ok: false,
      kind: 'missing_coords',
      title: 'Delivery location needed',
      message: 'Please select a delivery location on the map.',
      tone: 'warning',
      result: null,
      error: null,
    };
  }

  try {
    const result = await checkDeliveryLocation(latNum, lngNum);
    const classified = classifyDeliveryCheckResult(result, null);
    return {
      ok: classified.kind === 'serviceable',
      ...classified,
      result,
      error: null,
    };
  } catch (error) {
    const classified = classifyDeliveryCheckResult(null, error);
    return {
      ok: false,
      ...classified,
      result: null,
      error,
    };
  }
}
