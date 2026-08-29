/**
 * TanStack Query hooks for Authentication
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUser,
  updateProfile,
  changePassword,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} from '../utils/authApi';
import { addressKeys } from './useAddresses';
import { useToast } from '../context/ToastContext';

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
 * Change password mutation
 */
export function useChangePassword() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (passwordData) => changePassword(passwordData),
    onSuccess: () => {
      showToast('Password changed successfully.', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not change password. Please try again.', 'error');
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
        if (data.token) localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      }
    },
  });
}

function clearLocalAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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

/**
 * Forgot password mutation
 */
export function useForgotPassword() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (email) => forgotPassword(email),
    onSuccess: () => {
      showToast('Password reset link sent. Check your email.', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not send reset link. Please try again.', 'error');
    },
  });
}

/**
 * Reset password mutation
 */
export function useResetPassword() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (resetData) => resetPassword(resetData),
    onSuccess: () => {
      showToast('Password reset successfully. You can now log in.', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not reset password. Please try again.', 'error');
    },
  });
}
