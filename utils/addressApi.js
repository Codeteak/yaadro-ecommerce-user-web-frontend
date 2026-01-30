/**
 * Address API service functions
 * Uses the multi-tenant backend API
 */

import { api } from './apiClient';

/**
 * Transform API address to frontend format
 */
function transformAddress(apiAddress) {
  if (!apiAddress) return null;

  return {
    id: apiAddress.id,
    userId: apiAddress.userId || apiAddress.user_id,
    label: apiAddress.label || apiAddress.name || 'Address',
    fullName: apiAddress.fullName || apiAddress.full_name || '',
    phone: apiAddress.phone || '',
    address: apiAddress.street || apiAddress.address || '',
    street: apiAddress.street || apiAddress.address || '',
    city: apiAddress.city || '',
    state: apiAddress.state || '',
    postalCode: apiAddress.postalCode || apiAddress.postal_code || apiAddress.zipCode || '',
    zipCode: apiAddress.zipCode || apiAddress.postalCode || apiAddress.postal_code || '',
    country: apiAddress.country || 'India',
    isDefault: apiAddress.isDefault || apiAddress.is_default || false,
    landmark: apiAddress.landmark || '',
    addressType: apiAddress.addressType || apiAddress.address_type || 'other',
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
    const response = await api.get('/v1/addresses');
    const addresses = response?.addresses || response || [];
    return addresses.map(addr => transformAddress(addr));
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
    const response = await api.get(`/v1/addresses/${addressId}`);
    return transformAddress(response?.address || response);
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
    // Transform frontend format to API format
    const apiData = {
      label: addressData.label || addressData.name,
      fullName: addressData.fullName,
      phone: addressData.phone,
      street: addressData.street || addressData.address,
      city: addressData.city,
      state: addressData.state,
      postalCode: addressData.postalCode || addressData.zipCode,
      country: addressData.country || 'India',
      isDefault: addressData.isDefault || false,
      landmark: addressData.landmark || undefined,
      addressType: addressData.addressType || 'other',
    };

    const response = await api.post('/v1/addresses', apiData);
    return transformAddress(response?.address || response);
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
    // Transform frontend format to API format
    const apiData = {};
    
    if (addressData.label !== undefined) apiData.label = addressData.label || addressData.name;
    if (addressData.fullName !== undefined) apiData.fullName = addressData.fullName;
    if (addressData.phone !== undefined) apiData.phone = addressData.phone;
    if (addressData.street !== undefined || addressData.address !== undefined) {
      apiData.street = addressData.street || addressData.address;
    }
    if (addressData.city !== undefined) apiData.city = addressData.city;
    if (addressData.state !== undefined) apiData.state = addressData.state;
    if (addressData.postalCode !== undefined || addressData.zipCode !== undefined) {
      apiData.postalCode = addressData.postalCode || addressData.zipCode;
    }
    if (addressData.country !== undefined) apiData.country = addressData.country;
    if (addressData.isDefault !== undefined) apiData.isDefault = addressData.isDefault;
    if (addressData.landmark !== undefined) apiData.landmark = addressData.landmark;
    if (addressData.addressType !== undefined) apiData.addressType = addressData.addressType;

    const response = await api.patch(`/v1/addresses/${addressId}`, apiData);
    return transformAddress(response?.address || response);
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
  try {
    const response = await api.delete(`/v1/addresses/${addressId}`);
    return response;
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
}

/**
 * Set an address as default
 * @param {string} addressId - Address ID
 * @returns {Promise<object>}
 */
export async function setDefaultAddress(addressId) {
  try {
    const response = await api.patch(`/v1/addresses/${addressId}/set-default`, {});
    return transformAddress(response?.address || response);
  } catch (error) {
    console.error('Error setting default address:', error);
    throw error;
  }
}
