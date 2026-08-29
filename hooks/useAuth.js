/**
 * TanStack Query hooks for Authentication
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUser,
  updateProfile,
  refreshAccessToken,
  logoutUser,
} from '../utils/authApi';
import { addressKeys } from './useAddresses';
import { useToast } from '../context/ToastContext';
import { persistAccessToken } from '../utils/apiClient';

// Query keys
export const authKeys = {
  all: ['auth'],
  user: () => [...authKeys.all, 'user'],
};

/**
 * Get current user query
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Update profile mutation
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (profileData) => updateProfile(profileData),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data);
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      if (typeof window !== 'undefined' && data) {
        localStorage.setItem('user', JSON.stringify(data));
      }
      showToast('Profile updated!', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not update profile. Please try again.', 'error');
    },
  });
}

/**
 * Refresh token mutation
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: (refreshToken) => refreshAccessToken(refreshToken),
    onSuccess: (data) => {
      if (typeof window !== 'undefined' && data) {
        if (data.token) persistAccessToken(data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      }
    },
  });
}

function clearLocalAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

/**
 * Logout mutation — clears the entire query cache so no stale cart/order/address
 * data leaks to the next user session on this device.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear();
      clearLocalAuth();
    },
    onError: () => {
      // Even if the API call fails, clear local state so the user is logged out.
      queryClient.clear();
      clearLocalAuth();
    },
  });
}
