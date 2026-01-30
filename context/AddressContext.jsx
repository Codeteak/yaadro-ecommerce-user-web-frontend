'use client';

import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  useAddressesList,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '../hooks/useAddresses';

const AddressContext = createContext();

export function AddressProvider({ children }) {
  const { isAuthenticated } = useAuth();
  
  // Fetch addresses from API only if authenticated
  const { data: apiAddresses = [], isLoading, error } = useAddressesList(isAuthenticated);
  
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  // Use API addresses if authenticated, otherwise empty array
  const addresses = isAuthenticated ? apiAddresses : [];

  const addAddress = async (address) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add addresses');
    }
    try {
      // Return the created address so callers (e.g. checkout) can auto-select it
      return await createAddressMutation.mutateAsync(address);
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  };

  const updateAddress = async (id, updatedAddress) => {
    if (!isAuthenticated) {
      throw new Error('Please login to update addresses');
    }
    try {
      await updateAddressMutation.mutateAsync({ addressId: id, addressData: updatedAddress });
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  };

  const deleteAddress = async (id) => {
    if (!isAuthenticated) {
      throw new Error('Please login to delete addresses');
    }
    try {
      await deleteAddressMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  };

  const setDefaultAddress = async (id) => {
    if (!isAuthenticated) {
      throw new Error('Please login to set default address');
    }
    try {
      await setDefaultMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  };

  const getDefaultAddress = () => {
    return addresses.find(addr => addr.isDefault) || addresses[0] || null;
  };

  const value = {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    isLoading,
    error,
    // Mutation states for UI feedback
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending,
  };

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
}

