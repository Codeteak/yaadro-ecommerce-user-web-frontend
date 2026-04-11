/**
 * Address API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { getShopIdFromEnv } from './authApi';

/**
 * Transform API address to frontend format
 */
function transformAddress(apiAddress) {
  if (!apiAddress) return null;

  // Storefront address shape: { line1, line2, landmark, city, state, postalCode, country, lat, lng, raw }
  const line1 = apiAddress.line1 || '';
  const line2 = apiAddress.line2 || '';
  const street = [line1, line2].filter(Boolean).join(', ');

  return {
    id: apiAddress.id,
    userId: apiAddress.userId || apiAddress.user_id,
    // This storefront service stores one linked address; treat it as default/home.
    label: apiAddress.label || apiAddress.name || 'Home',
    fullName: apiAddress.fullName || apiAddress.full_name || '',
    phone: apiAddress.phone || '',
    line1,
    line2,
    address: street,
    street,
    city: apiAddress.city || '',
    state: apiAddress.state || '',
    postalCode: apiAddress.postalCode || apiAddress.postal_code || apiAddress.zipCode || '',
    zipCode: apiAddress.zipCode || apiAddress.postalCode || apiAddress.postal_code || '',
    country: apiAddress.country || 'India',
    isDefault: true,
    landmark: apiAddress.landmark || '',
    addressType: apiAddress.addressType || apiAddress.address_type || 'other',
    lat: apiAddress.lat ?? null,
    lng: apiAddress.lng ?? null,
    raw: apiAddress.raw ?? null,
    createdAt: apiAddress.createdAt || apiAddress.created_at || '',
    updatedAt: apiAddress.updatedAt || apiAddress.updated_at || '',
  };
}

/**
 * List all addresses for current user
 * @returns {Promise<array>}
 */
export async function listAddresses() {
  try {
    const shopId = getShopIdFromEnv();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for storefront address).');

    const response = await apiFetchRoot('/storefront/address', {
      method: 'GET',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
    });

    const addr = transformAddress(response?.address || null);
    return addr ? [addr] : [];
  } catch (error) {
    console.error('Error listing addresses:', error);
    throw error;
  }
}

/**
 * Get address by ID
 * @param {string} addressId - Address ID
 * @returns {Promise<object>}
 */
export async function getAddress(addressId) {
  try {
    // Storefront service exposes a single linked address; ignore addressId and return it.
    const list = await listAddresses();
    return list[0] || null;
  } catch (error) {
    console.error('Error getting address:', error);
    throw error;
  }
}

/**
 * Create a new address
 * @param {object} addressData - Address data
 * @returns {Promise<object>}
 */
export async function createAddress(addressData) {
  try {
    const shopId = getShopIdFromEnv();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for storefront address).');

    const rawVal = addressData.raw;
    const apiData = {
      line1: addressData.line1 || addressData.street || addressData.address || '',
      line2: addressData.line2 || '',
      landmark: addressData.landmark || '',
      city: addressData.city || '',
      state: addressData.state || '',
      postalCode: addressData.postalCode || addressData.zipCode || '',
      country: addressData.country || 'India',
      lat: addressData.lat ?? null,
      lng: addressData.lng ?? null,
      raw:
        rawVal != null && String(rawVal).trim() !== ''
          ? String(rawVal).trim()
          : null,
    };

    await apiFetchRoot('/storefront/address', {
      method: 'POST',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body: apiData,
    });

    const list = await listAddresses();
    return list[0] || null;
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
}

/**
 * Update an existing address
 * @param {string} addressId - Address ID
 * @param {object} addressData - Address data to update
 * @returns {Promise<object>}
 */
export async function updateAddress(addressId, addressData) {
  try {
    const shopId = getShopIdFromEnv();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for storefront address).');

    const apiData = {};
    if (addressData.street !== undefined || addressData.address !== undefined) {
      apiData.line1 = addressData.street || addressData.address || '';
    }
    if (addressData.line1 !== undefined) apiData.line1 = addressData.line1;
    if (addressData.line2 !== undefined) apiData.line2 = addressData.line2;
    if (addressData.city !== undefined) apiData.city = addressData.city;
    if (addressData.state !== undefined) apiData.state = addressData.state;
    if (addressData.postalCode !== undefined || addressData.zipCode !== undefined) {
      apiData.postalCode = addressData.postalCode || addressData.zipCode || '';
    }
    if (addressData.country !== undefined) apiData.country = addressData.country;
    if (addressData.landmark !== undefined) apiData.landmark = addressData.landmark;
    if (addressData.lat !== undefined) apiData.lat = addressData.lat;
    if (addressData.lng !== undefined) apiData.lng = addressData.lng;
    if (addressData.raw !== undefined) apiData.raw = addressData.raw;

    await apiFetchRoot('/storefront/address', {
      method: 'PATCH',
      headers: { 'x-shop-id': shopId },
      omitTenantHeader: true,
      body: apiData,
    });

    const list = await listAddresses();
    return list[0] || null;
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
}

/**
 * Delete an address
 * @param {string} addressId - Address ID
 * @returns {Promise<object>}
 */
export async function deleteAddress(addressId) {
  throw new Error('Delete address is not supported by this storefront API.');
}

/**
 * Set an address as default
 * @param {string} addressId - Address ID
 * @returns {Promise<object>}
 */
export async function setDefaultAddress(addressId) {
  // Storefront API exposes a single linked address; treat it as default.
  const list = await listAddresses();
  return list[0] || null;
}
