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
import { getAddressSaveErrorMessage } from '../utils/apiErrors';
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
    // Match QueryProvider; AddressContext invalidates on visibility for PWA resume.
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
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
      // createAddress already GETs the linked address after POST (204 body).
      // Seed cache from that result — do not invalidate (second listAddresses).
      queryClient.setQueryData(addressKeys.list(), () => {
        if (!created?.id) return [];
        return [{ ...created, isDefault: true }];
      });
      showToast('Address saved!', 'success');
    },
    onError: (error) => {
      showToast(getAddressSaveErrorMessage(error), 'error');
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
    onSuccess: (data) => {
      // updateAddress already GETs after PATCH — seed cache, skip invalidate refetch.
      queryClient.setQueryData(addressKeys.list(), () => {
        if (!data?.id) return [];
        return [{ ...data, isDefault: true }];
      });
      if (data?.id) {
        queryClient.setQueryData(addressKeys.detail(data.id), data);
      }
      showToast('Address updated!', 'success');
    },
    onError: (error) => {
      showToast(getAddressSaveErrorMessage(error), 'error');
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
