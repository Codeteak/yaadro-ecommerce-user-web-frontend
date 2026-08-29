/**
 * Authentication API service functions
 * Uses the multi-tenant backend API
 */

import { api, apiFetchRoot } from './apiClient';
import {
  normalizeOtpPhone,
  normalizePhoneForApi,
  buildOtpVerifyRequestBody,
} from './otpVerifyPayload.js';



/** Re-export for callers that imported OTP helpers from authApi. */
export {
  normalizeOtpPhone,
  normalizePhoneForApi,
  formatPhoneForDisplay,
  buildOtpVerifyRequestBody,
} from './otpVerifyPayload';

import {
  RESOLVED_SHOP_HOST_STORAGE_KEY,
  RESOLVED_SHOP_ID_STORAGE_KEY,
  resolveShopIdFromDomain,
} from './shopResolver';

function getCurrentShopDomain() {
  if (typeof window === 'undefined') return '';
  return String(window.location.hostname || '').toLowerCase().trim();
}

function readCachedShopIdForDomain(domain) {
  if (!domain || typeof window === 'undefined') return '';
  const cachedHost = window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY) || '';
  const cachedShopId = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY) || '';
  return cachedHost === domain && cachedShopId ? cachedShopId : '';
}

/** User-facing message when shop/tenant cannot be resolved. */
export function getShopIdConfigError() {
  if (process.env.NODE_ENV !== 'production') {
    return 'Missing shop ID. Set NEXT_PUBLIC_SHOP_ID in your environment.';
  }
  return 'This store could not be loaded for this domain. Check that the domain is registered with the backend, or try again.';
}

/** Shop UUID for storefront auth (OpenAPI: `shopId`). Set `NEXT_PUBLIC_SHOP_ID` in env. */
export function getShopIdFromEnv() {
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim()
    : '';

  if (typeof window === 'undefined') return envShopId;
  if (process.env.NODE_ENV !== 'production') return envShopId;

  return readCachedShopIdForDomain(getCurrentShopDomain()) || '';
}

/**
 * Resolve shop id for current domain.
 * - Development: always return NEXT_PUBLIC_SHOP_ID.
 * - Production: resolve from tenant resolver API and cache by domain.
 */
export async function resolveShopId() {
  return resolveShopIdFromDomain();
}

async function resolveShopIdForOtp(explicitShopId) {
  const explicit = explicitShopId != null ? String(explicitShopId).trim() : '';
  const runtime = await resolveShopId();
  const rt = runtime != null ? String(runtime).trim() : '';
  // Prefer freshly resolved shop for the current origin so OTP request + verify always use the same
  // tenant (avoids stale React state vs domain resolver / cache drift on PWA or slow hydrate).
  return rt || explicit || '';
}

/**
 * Map session response (OTP verify / phone-change verify) for AuthContext.
 * Supports camelCase and snake_case tokens and common `{ data, session }` envelopes.
 */
export function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return { user: null, token: null, refreshToken: null };
  }

  let root = session;
  if (root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)) {
    root = { ...session, ...root.data };
  }
  const merged =
    root.session != null && typeof root.session === 'object' && !Array.isArray(root.session)
      ? { ...root, ...root.session }
      : root;

  const rawUser =
    merged.user ||
    merged.customer ||
    merged.profile ||
    merged.account ||
    null;
  const normalizedUser = rawUser ? normalizeCustomer(rawUser) : null;

  const token =
    merged.accessToken ||
    merged.token ||
    merged.access_token ||
    merged.jwt ||
    merged.idToken ||
    merged.id_token ||
    null;
  const refreshToken = merged.refreshToken || merged.refresh_token || null;

  return {
    user: normalizedUser || rawUser,
    token: token != null && String(token).trim() ? String(token).trim() : null,
    refreshToken: refreshToken != null && String(refreshToken).trim() ? String(refreshToken).trim() : null,
  };
}

/**
 * Unwrap GET/PATCH /api/me/profile JSON (supports `{ user, customer, address }` and legacy shapes).
 * @returns {{ user: object|null, customer: object|null, address: object|null }}
 */
export function unwrapMeProfileResponse(response) {
  if (!response || typeof response !== 'object') {
    return { user: null, customer: null, address: null };
  }
  // Wrapped API envelope: { status, data: { user, customer, address } }
  const payload =
    response.data != null && typeof response.data === 'object' && ('user' in response.data || 'customer' in response.data)
      ? response.data
      : response;

  if ('user' in payload || 'customer' in payload || 'address' in payload) {
    return {
      user: payload.user ?? null,
      customer: payload.customer ?? null,
      address: payload.address ?? null,
    };
  }
  // Legacy: top-level object was the customer record only
  return { user: null, customer: payload, address: null };
}

/**
 * Merge GET/PATCH /api/me/profile `{ user, customer, address }` into one app `user` object.
 * Per backend: `user.name` aligns with customer display name; `user.phone` / `user.email` come from `users`.
 */
export function normalizeCustomerFromMeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;

  const { user, customer, address } = unwrapMeProfileResponse(profile);

  if (!user && !customer) {
    return normalizeCustomer(profile);
  }

  const stored =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const txt = window.localStorage.getItem('user');
            return txt ? JSON.parse(txt) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const u = user && typeof user === 'object' ? user : {};
  const c = customer && typeof customer === 'object' ? customer : {};

  const displayName =
    (u.name != null && String(u.name).trim()) ||
    (c.displayName != null && String(c.displayName).trim()) ||
    (stored?.name && String(stored.name).trim()) ||
    (stored?.displayName && String(stored.displayName).trim()) ||
    '';

  const phoneRaw = u.phone ?? u.mobile ?? c.phone ?? stored?.phone ?? '';
  const phone = normalizePhoneForApi(phoneRaw);

  const email =
    (u.email != null && String(u.email).trim()) || (stored?.email != null && String(stored.email).trim()) || '';

  return {
    ...c,
    id: c.id ?? u.id ?? null,
    customerId: c.id ?? null,
    userId: u.id ?? null,
    name: displayName,
    displayName: (c.displayName != null && String(c.displayName).trim()) || displayName,
    email,
    phone,
    dateOfBirth: c.dateOfBirth ?? c.date_of_birth ?? u.dateOfBirth,
    gender: c.gender ?? u.gender,
    /** Linked tenant address from GET/PATCH /api/me/profile (not storefront /address). */
    linkedAddress: address ?? null,
  };
}

/**
 * Normalize legacy flat `customer` or session user for app UI (`name` mirrors `displayName`).
 */
export function normalizeCustomer(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const stored =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const txt = window.localStorage.getItem('user');
            return txt ? JSON.parse(txt) : null;
          } catch {
            return null;
          }
        })()
      : null;

  const fromFirstLast = [raw.firstName, raw.lastName]
    .filter((x) => x != null && String(x).trim() !== '')
    .map((x) => String(x).trim())
    .join(' ')
    .trim();

  const displayName =
    (raw.displayName && String(raw.displayName).trim()) ||
    (raw.name && String(raw.name).trim()) ||
    (raw.fullName && String(raw.fullName).trim()) ||
    fromFirstLast ||
    (stored?.displayName && String(stored.displayName).trim()) ||
    (stored?.name && String(stored.name).trim()) ||
    '';

  const phoneRaw =
    raw.phone ??
    raw.mobile ??
    raw.phoneNumber ??
    raw.msisdn ??
    stored?.phone ??
    stored?.mobile ??
    '';

  const phone = normalizePhoneForApi(phoneRaw);

  return {
    ...raw,
    id: raw.id ?? raw.customerId ?? raw.userId,
    name: displayName,
    displayName,
    email: raw.email ?? stored?.email ?? '',
    phone,
    dateOfBirth: raw.dateOfBirth ?? raw.date_of_birth,
    gender: raw.gender,
  };
}

/**
 * Request mobile OTP (POST /api/auth/otp/request)
 * Always sends `phone` and `shopId` in the JSON body and `x-shop-id` when shop is known.
 */
export async function requestOtp({ phone, shopId }) {
  const resolvedShopId = await resolveShopIdForOtp(shopId);
  const resolvedPhone = normalizeOtpPhone(phone);
  if (!resolvedShopId) throw new Error('Missing shopId for OTP request.');
  if (!resolvedPhone) throw new Error('Missing phone number.');
  const body = { phone: resolvedPhone, shopId: resolvedShopId };
  const headers = {};
  if (resolvedShopId) headers['x-shop-id'] = resolvedShopId;
  return api.post('/auth/otp/request', body, {
    omitTenantHeader: true,
    omitAuthHeader: true,
    headers,
  });
}

/**
 * Verify mobile OTP (POST /api/auth/otp/verify) -> returns session payload
 * JSON body is exactly `{ phone, shopId, code }` (see `buildOtpVerifyRequestBody`).
 * Also sends header `x-shop-id` when shop is known.
 */
export async function verifyOtp({ phone, shopId, code }) {
  const resolvedShopId = await resolveShopIdForOtp(shopId);
  const body = buildOtpVerifyRequestBody({
    phone,
    shopId: resolvedShopId,
    code,
  });
  if (!body.shopId) throw new Error('Missing shopId for OTP verification.');
  if (!body.phone) throw new Error('Missing phone number.');
  if (!body.code) throw new Error('Missing OTP code.');
  const headers = {};
  if (resolvedShopId) headers['x-shop-id'] = resolvedShopId;

  return api.post('/auth/otp/verify', body, {
    omitTenantHeader: true,
    omitAuthHeader: true,
    headers,
  });
}

/**
 * GET /api/me/profile — returns `{ user, customer, address }` (see backend profile routes).
 */
export async function getMeProfile() {
  const response = await api.get('/me/profile');
  return unwrapMeProfileResponse(response);
}

/**
 * Get current authenticated user (merged from `user` + `customer` on GET /api/me/profile).
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    const profile = await getMeProfile();
    return normalizeCustomerFromMeProfile(profile);
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

/**
 * PATCH /api/me/profile — name and email only.
 * Phone changes use the phone-change OTP flow. Address uses /api/storefront/address.
 *
 * @param {object} profileData - `name` or `displayName`, optional `email`
 * @returns {Promise<object|null>}
 */
export async function updateProfile(profileData) {
  try {
    const displayName =
      profileData.displayName !== undefined
        ? profileData.displayName
        : profileData.name;

    const patchBody = {};
    if (displayName !== undefined && String(displayName).trim() !== '') {
      patchBody.displayName = String(displayName).trim();
    }
    if (profileData.email !== undefined) {
      patchBody.email =
        profileData.email === null || profileData.email === ''
          ? null
          : String(profileData.email).trim();
    }

    if (Object.keys(patchBody).length === 0) return getCurrentUser();

    const raw = await api.patch('/me/profile', patchBody);
    return normalizeCustomerFromMeProfile(raw) || getCurrentUser();
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Request OTP to change the login phone (POST /api/storefront/phone/change/request-otp).
 */
export async function requestPhoneChangeOtp(newPhone) {
  const shopId = await resolveShopId();
  if (!shopId) throw new Error('Missing shop ID.');
  const phone = normalizeOtpPhone(newPhone);
  if (!phone) throw new Error('Enter a valid 10-digit mobile number.');
  return apiFetchRoot('/storefront/phone/change/request-otp', {
    method: 'POST',
    headers: { 'x-shop-id': shopId },
    body: { newPhone: phone },
  });
}

/**
 * Verify phone-change OTP. On success the API issues a new session.
 * @returns {Promise<{ token: string|null, refreshToken: string|null, raw: object }>}
 */
export async function verifyPhoneChangeOtp({ newPhone, code }) {
  const shopId = await resolveShopId();
  if (!shopId) throw new Error('Missing shop ID.');
  const phone = normalizeOtpPhone(newPhone);
  const otp = String(code || '').trim();
  if (!phone) throw new Error('Enter a valid 10-digit mobile number.');
  if (!otp) throw new Error('Enter the OTP code.');
  const raw = await apiFetchRoot('/storefront/phone/change/verify-otp', {
    method: 'POST',
    headers: { 'x-shop-id': shopId },
    body: { newPhone: phone, code: otp },
  });
  const layer =
    raw?.data != null && typeof raw.data === 'object' ? { ...raw, ...raw.data } : raw || {};
  return {
    token: layer.accessToken || layer.token || null,
    refreshToken: layer.refreshToken || null,
    raw: layer,
  };
}

/**
 * Normalize POST /api/auth/refresh payload (`accessToken`, `refreshToken`, optional `data` envelope).
 * @param {object} response — already unwrapped `data` when API uses `{ status, data }`
 */
function normalizeRefreshResponse(response, previousRefreshToken) {
  if (!response || typeof response !== 'object') {
    return { token: null, refreshToken: previousRefreshToken || null };
  }
  const layer =
    response.data != null && typeof response.data === 'object'
      ? response.data
      : response;
  const token =
    layer.accessToken ||
    layer.token ||
    response.accessToken ||
    response.token ||
    null;
  const nextRefresh =
    layer.refreshToken ||
    response.refreshToken ||
    previousRefreshToken ||
    null;
  return { token, refreshToken: nextRefresh };
}

export async function refreshAccessToken(refreshToken) {
  try {
    const response = await api.post('/auth/refresh', { refreshToken }, {
      omitAuthHeader: true,
      omitTenantHeader: true,
    });
    return normalizeRefreshResponse(response, refreshToken);
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
    const refreshToken =
      typeof window !== 'undefined' ? window.localStorage.getItem('refreshToken') || '' : '';
    const body = refreshToken ? { refreshToken } : undefined;
    return await api.post('/auth/logout', body);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}
