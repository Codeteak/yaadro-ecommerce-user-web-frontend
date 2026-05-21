'use client';

import { createContext, useContext, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import {
  useAddressesList,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  addressKeys,
} from '../hooks/useAddresses';

const AddressContext = createContext();

export function AddressProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch addresses from API only if authenticated
  const { data: apiAddresses = [], isLoading, error } = useAddressesList(isAuthenticated);

  /** Installed PWAs often miss window focus events; refresh linked address when app tabs back or resumes from bfcache. */
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return undefined;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: addressKeys.all });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') invalidate();
    };

    /** iOS/Android standalone: restoring from suspended state */
    const onPageShow = (event) => {
      if (event.persisted) invalidate();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isAuthenticated, queryClient]);
  
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

