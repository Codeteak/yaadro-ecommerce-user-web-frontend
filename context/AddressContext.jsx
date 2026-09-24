'use client';

import { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
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
import { attachVisibilityResume } from '../utils/visibilityResume';

const AddressContext = createContext();

export function AddressProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch addresses from API only if authenticated
  const { data: apiAddresses = [], isLoading, error } = useAddressesList(isAuthenticated);

  /** PWA / tab resume — refresh linked address with cooldown (avoid invalidate storms). */
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return undefined;

    return attachVisibilityResume(
      () => {
        void queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      },
      { cooldownMs: 60_000 },
    );
  }, [isAuthenticated, queryClient]);
  
  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  // Use API addresses if authenticated, otherwise empty array
  const addresses = isAuthenticated ? apiAddresses : [];

  const addAddress = useCallback(
    async (address) => {
      if (!isAuthenticated) {
        throw new Error('Please login to add addresses');
      }
      try {
        // Return the created address so callers (e.g. checkout) can auto-select it
        return await createAddressMutation.mutateAsync(address);
      } catch (err) {
        console.error('Error adding address:', err);
        throw err;
      }
    },
    [isAuthenticated, createAddressMutation],
  );

  const updateAddress = useCallback(
    async (id, updatedAddress) => {
      if (!isAuthenticated) {
        throw new Error('Please login to update addresses');
      }
      try {
        await updateAddressMutation.mutateAsync({ addressId: id, addressData: updatedAddress });
      } catch (err) {
        console.error('Error updating address:', err);
        throw err;
      }
    },
    [isAuthenticated, updateAddressMutation],
  );

  const deleteAddress = useCallback(
    async (id) => {
      if (!isAuthenticated) {
        throw new Error('Please login to delete addresses');
      }
      try {
        await deleteAddressMutation.mutateAsync(id);
      } catch (err) {
        console.error('Error deleting address:', err);
        throw err;
      }
    },
    [isAuthenticated, deleteAddressMutation],
  );

  const setDefaultAddress = useCallback(
    async (id) => {
      if (!isAuthenticated) {
        throw new Error('Please login to set default address');
      }
      try {
        await setDefaultMutation.mutateAsync(id);
      } catch (err) {
        console.error('Error setting default address:', err);
      }
    },
    [isAuthenticated, setDefaultMutation],
  );

  const getDefaultAddress = useCallback(() => {
    return addresses.find((addr) => addr.isDefault) || addresses[0] || null;
  }, [addresses]);

  const value = useMemo(
    () => ({
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
    }),
    [
      addresses,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getDefaultAddress,
      isLoading,
      error,
      createAddressMutation.isPending,
      updateAddressMutation.isPending,
      deleteAddressMutation.isPending,
      setDefaultMutation.isPending,
    ],
  );

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
}
