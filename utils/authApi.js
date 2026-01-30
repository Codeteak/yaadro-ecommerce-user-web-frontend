/**
 * Authentication API service functions
 * Uses the multi-tenant backend API
 */

import { api } from './apiClient';

/**
 * Get current authenticated user
 * @returns {Promise<object>}
 */
export async function getCurrentUser() {
  try {
    const response = await api.get('/auth/me');
    return response?.user || response;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>}
 */
export async function updateProfile(profileData) {
  try {
    const response = await api.patch('/auth/profile', profileData);
    return response?.user || response;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Change or set password
 * @param {object} passwordData - Password data
 * @param {string} [passwordData.currentPassword] - Current password (optional for first-time setup)
 * @param {string} passwordData.newPassword - New password
 * @returns {Promise<object>}
 */
export async function changePassword(passwordData) {
  try {
    const response = await api.patch('/auth/change-password', passwordData);
    return response;
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<{token: string, refreshToken: string}>}
 */
export async function refreshAccessToken(refreshToken) {
  try {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    return {
      token: response?.token || response?.data?.token,
      refreshToken: response?.refreshToken || response?.data?.refreshToken,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Logout user
 * @returns {Promise<object>}
 */
export async function logoutUser() {
  try {
    const response = await api.post('/auth/logout');
    return response;
  } catch (error) {
    console.error('Error logging out:', error);
    // Even if logout fails, we should still clear local state
    throw error;
  }
}

/**
 * Request password reset email
 * @param {string} email - User email
 * @returns {Promise<object>}
 */
export async function forgotPassword(email) {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
}

/**
 * Reset password using token
 * @param {object} resetData - Reset data
 * @param {string} resetData.token - Reset token from email
 * @param {string} resetData.password - New password
 * @returns {Promise<object>}
 */
export async function resetPassword(resetData) {
  try {
    const response = await api.post('/auth/reset-password', resetData);
    return response;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}
