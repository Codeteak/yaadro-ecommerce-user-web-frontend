/**
 * TanStack Query hooks for Addresses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../utils/addressApi';

// Query keys
export const addressKeys = {
  all: ['addresses'],
  lists: () => [...addressKeys.all, 'list'],
  list: () => [...addressKeys.lists()],
  details: () => [...addressKeys.all, 'detail'],
  detail: (id) => [...addressKeys.details(), id],
};

/**
 * List addresses query
 */
export function useAddressesList(enabled = true) {
  return useQuery({
    queryKey: addressKeys.list(),
    queryFn: listAddresses,
    enabled: enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Get address details query
 */
export function useAddressDetail(addressId) {
  return useQuery({
    queryKey: addressKeys.detail(addressId),
    queryFn: () => getAddress(addressId),
    enabled: !!addressId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create address mutation
 */
export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressData) => createAddress(addressData),
    onSuccess: (created) => {
      // Immediately add to cache so it appears in the list right away
      queryClient.setQueryData(addressKeys.list(), (old) => {
        const prev = Array.isArray(old) ? old : [];
        if (!created?.id) return prev;
        const exists = prev.some((a) => a?.id === created.id);
        return exists ? prev : [created, ...prev];
      });
      // Then revalidate from server
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
    onError: (error) => {
      console.error('Error creating address:', error);
    },
  });
}

/**
 * Update address mutation
 */
export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, addressData }) => updateAddress(addressId, addressData),
    onSuccess: (data, variables) => {
      // Invalidate addresses list
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      // Invalidate specific address detail
      queryClient.invalidateQueries({ queryKey: addressKeys.detail(variables.addressId) });
    },
    onError: (error) => {
      console.error('Error updating address:', error);
    },
  });
}

/**
 * Delete address mutation
 */
export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId) => deleteAddress(addressId),
    onSuccess: () => {
      // Invalidate addresses list
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
    onError: (error) => {
      console.error('Error deleting address:', error);
    },
  });
}

/**
 * Set default address mutation
 */
export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId) => setDefaultAddress(addressId),
    onSuccess: () => {
      // Invalidate addresses list to refresh default status
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
    },
    onError: (error) => {
      console.error('Error setting default address:', error);
    },
  });
}
