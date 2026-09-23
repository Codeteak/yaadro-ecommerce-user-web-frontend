/**
 * Address API service functions
 * Uses the multi-tenant backend API
 */

import { apiFetchRoot } from './apiClient';
import { resolveShopId } from './authApi';
import {
  sanitizeAddressNotes,
  toStorefrontAddressBody,
  toStorefrontAddressPatch,
} from './storefrontAddressPayload.mjs';

export {
  sanitizeAddressNotes,
  toStorefrontAddressBody,
  toStorefrontAddressPatch,
};

/**
 * Transform API address to frontend format
 */
function transformAddress(apiAddress) {
  if (!apiAddress) return null;

  // Storefront address shape: { line1, line2, landmark, city, lat, lng, raw }
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
    isDefault: true,
    landmark: apiAddress.landmark || '',
    addressType: apiAddress.addressType || apiAddress.address_type || 'other',
    lat: apiAddress.lat ?? null,
    lng: apiAddress.lng ?? null,
    raw: sanitizeAddressNotes(apiAddress.raw) || null,
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
    const shopId = await resolveShopId();
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
    void addressId;
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
    const shopId = await resolveShopId();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for storefront address).');

    const apiData = toStorefrontAddressBody(addressData);

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
    void addressId;
    const shopId = await resolveShopId();
    if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for storefront address).');

    const apiData = toStorefrontAddressPatch(addressData);

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
 * Delete the linked storefront address
 * @param {string} [_addressId] - Ignored; storefront has a single linked address
 * @returns {Promise<void>}
 */
export async function deleteAddress(_addressId) {
  void _addressId;
  const shopId = await resolveShopId();
  if (!shopId) throw new Error('Missing NEXT_PUBLIC_SHOP_ID (required for storefront address).');

  await apiFetchRoot('/storefront/address', {
    method: 'DELETE',
    headers: { 'x-shop-id': shopId },
    omitTenantHeader: true,
  });
}

/**
 * Set an address as default
 * @param {string} addressId - Address ID
 * @returns {Promise<object>}
 */
export async function setDefaultAddress(addressId) {
  // Storefront API exposes a single linked address; treat it as default.
  void addressId;
  const list = await listAddresses();
  return list[0] || null;
}
