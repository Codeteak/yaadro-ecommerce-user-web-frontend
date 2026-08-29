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
import { useToast } from '../context/ToastContext';

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
    // Standalone / installed PWA rarely gets window focus like a tab; rely on invalidate + visibility refetch instead of long staleness.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (addressData) => createAddress(addressData),
    onSuccess: (created) => {
      queryClient.setQueryData(addressKeys.list(), (old) => {
        const prev = Array.isArray(old) ? old : [];
        if (!created?.id) return prev;
        const idx = prev.findIndex((a) => String(a?.id) === String(created.id));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...prev[idx], ...created };
          return next;
        }
        return [created, ...prev];
      });
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      showToast('Address saved!', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not save address. Please try again.', 'error');
    },
  });
}

/**
 * Update address mutation
 */
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ addressId, addressData }) => updateAddress(addressId, addressData),
    onSuccess: (data, variables) => {
      if (data?.id) {
        queryClient.setQueryData(addressKeys.list(), (old) => {
          const prev = Array.isArray(old) ? old : [];
          const idx = prev.findIndex((a) => String(a?.id) === String(data.id));
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...prev[idx], ...data };
            return next;
          }
          return [data];
        });
      }
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      queryClient.invalidateQueries({ queryKey: addressKeys.detail(variables.addressId) });
      showToast('Address updated!', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not update address. Please try again.', 'error');
    },
  });
}

/**
 * Delete address mutation
 */
export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (addressId) => deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      showToast('Address removed.', 'info');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not remove address. Please try again.', 'error');
    },
  });
}

/**
 * Set default address mutation
 */
export function useSetDefaultAddress() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (addressId) => setDefaultAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      showToast('Default address updated.', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not set default address. Please try again.', 'error');
    },
  });
}
