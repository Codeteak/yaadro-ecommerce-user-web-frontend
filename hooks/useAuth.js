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

  return useMutation({
    mutationFn: (profileData) => updateProfile(profileData),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data);
      queryClient.invalidateQueries({ queryKey: addressKeys.lists() });
      if (typeof window !== 'undefined' && data) {
        localStorage.setItem('user', JSON.stringify(data));
      }
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
    },
  });
}

/**
 * Change password mutation
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (passwordData) => changePassword(passwordData),
    onError: (error) => {
      console.error('Error changing password:', error);
    },
  });
}

/**
 * Refresh token mutation
 */
export function useRefreshToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (refreshToken) => refreshAccessToken(refreshToken),
    onSuccess: (data) => {
      // Update tokens in localStorage
      if (typeof window !== 'undefined' && data) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
      }
    },
    onError: (error) => {
      console.error('Error refreshing token:', error);
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      // Clear auth cache
      queryClient.setQueryData(authKeys.user(), null);
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    },
    onError: (error) => {
      console.error('Error logging out:', error);
      // Even if logout fails, clear local state
      queryClient.setQueryData(authKeys.user(), null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    },
  });
}

/**
 * Forgot password mutation
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => forgotPassword(email),
    onError: (error) => {
      console.error('Error requesting password reset:', error);
    },
  });
}

/**
 * Reset password mutation
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (resetData) => resetPassword(resetData),
    onError: (error) => {
      console.error('Error resetting password:', error);
    },
  });
}
