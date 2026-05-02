/**
 * Authentication API service functions
 * Uses the multi-tenant backend API
 */

import { api, apiFetch, apiFetchRoot } from './apiClient';
import {
  normalizeOtpPhone,
  buildOtpVerifyRequestBody,
} from './otpVerifyPayload.js';

/** Re-export for callers that imported OTP helpers from authApi. */
export { normalizeOtpPhone, buildOtpVerifyRequestBody };

const RESOLVED_SHOP_ID_STORAGE_KEY = 'yaadro_resolved_shop_id';
const RESOLVED_SHOP_HOST_STORAGE_KEY = 'yaadro_resolved_shop_host';

function getDefaultTenantResolverUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
    ? String(process.env.NEXT_PUBLIC_API_BASE_URL).trim()
    : process.env.NEXT_PUBLIC_API_URL
    ? `${String(process.env.NEXT_PUBLIC_API_URL).trim().replace(/\/+$/, '')}/api`
    : '';
  if (!base) return '';
  const apiBase = base.replace(/\/+$/, '');
  return `${apiBase}/shops/resolve-by-domain`;
}

/** Shop UUID for storefront auth (OpenAPI: `shopId`). Set `NEXT_PUBLIC_SHOP_ID` in env. */
export function getShopIdFromEnv() {
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim()
    : '';

  if (typeof window === 'undefined') return envShopId;
  if (process.env.NODE_ENV !== 'production') return envShopId;

  const currentHost = String(window.location.host || '').toLowerCase().trim();
  const cachedHost = window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY) || '';
  const cachedShopId = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY) || '';
  if (currentHost && cachedHost === currentHost && cachedShopId) return cachedShopId;

  return '';
}

function normalizeResolverResponse(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const raw =
    payload.shopId ??
    payload.shop_id ??
    payload.tenantId ??
    payload.tenant_id ??
    payload?.data?.shopId ??
    payload?.data?.shop_id;
  return raw ? String(raw).trim() : '';
}

function persistResolvedShopId(host, shopId) {
  if (typeof window === 'undefined') return;
  if (!host || !shopId) return;
  window.localStorage.setItem(RESOLVED_SHOP_HOST_STORAGE_KEY, host);
  window.localStorage.setItem(RESOLVED_SHOP_ID_STORAGE_KEY, shopId);
}

/**
 * Resolve shop id for current domain.
 * - Development: always return NEXT_PUBLIC_SHOP_ID.
 * - Production: resolve from tenant resolver API and cache by domain.
 */
export async function resolveShopId() {
  const envShopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim()
    : '';

  if (typeof window === 'undefined') return envShopId;
  if (process.env.NODE_ENV !== 'production') return envShopId;

  const domain = String(window.location.hostname || '').toLowerCase().trim();
  if (!domain) return '';

  const cachedHost = window.localStorage.getItem(RESOLVED_SHOP_HOST_STORAGE_KEY) || '';
  const cachedShopId = window.localStorage.getItem(RESOLVED_SHOP_ID_STORAGE_KEY) || '';
  if (cachedHost === domain && cachedShopId) return cachedShopId;

  const resolverUrl = process.env.NEXT_PUBLIC_TENANT_RESOLVER_URL
    ? String(process.env.NEXT_PUBLIC_TENANT_RESOLVER_URL).trim()
    : getDefaultTenantResolverUrl();
  if (!resolverUrl) return '';

  try {
    const url = new URL(resolverUrl);
    url.searchParams.set('domain', domain);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return '';

    const payload = await response.json();
    const resolvedShopId = normalizeResolverResponse(payload);
    if (resolvedShopId) {
      persistResolvedShopId(domain, resolvedShopId);
    }
    return resolvedShopId;
  } catch {
    return '';
  }
}

async function resolveShopIdForOtp(explicitShopId) {
  const fromArg = explicitShopId != null ? String(explicitShopId).trim() : '';
  if (fromArg) return fromArg;
  return resolveShopId();
}

/**
 * Map SessionResponse (register / login / OAuth JWT) for AuthContext.
 */
export function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return { user: null, token: null, refreshToken: null };
  }
  const rawUser = session.user || session.customer || null;
  const normalizedUser = rawUser ? normalizeCustomer(rawUser) : null;
  return {
    user: normalizedUser || rawUser,
    token: session.accessToken || session.token || null,
    refreshToken: session.refreshToken || null,
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
  const phone =
    phoneRaw != null && String(phoneRaw).trim() !== ''
      ? String(phoneRaw).replace(/\s/g, '').trim()
      : '';

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

  const phone = phoneRaw != null && String(phoneRaw).trim() !== '' ? String(phoneRaw).replace(/\s/g, '').trim() : '';

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
 * Map app / form address fields to PATCH /api/me/profile `address` shape.
 * Server rule: `lat` and `lng` must both be set or both null — never send only one.
 */
export function mapAppAddressToMeProfileAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const out = {};
  if (addr.line1 !== undefined) out.line1 = addr.line1;
  else if (addr.street !== undefined || addr.address !== undefined) {
    out.line1 = addr.street ?? addr.address ?? '';
  }
  if (addr.line2 !== undefined) out.line2 = addr.line2;
  if (addr.landmark !== undefined) out.landmark = addr.landmark;
  if (addr.city !== undefined) out.city = addr.city;
  if (addr.state !== undefined) out.state = addr.state;
  if (addr.postalCode !== undefined || addr.zipCode !== undefined) {
    out.postalCode = addr.postalCode ?? addr.zipCode ?? '';
  }
  if (addr.country !== undefined) out.country = addr.country;
  if (addr.raw !== undefined) out.raw = addr.raw;

  const hasLat = 'lat' in addr;
  const hasLng = 'lng' in addr;
  if (hasLat && hasLng) {
    if (addr.lat == null && addr.lng == null) {
      out.lat = null;
      out.lng = null;
    } else if (addr.lat != null && addr.lng != null) {
      out.lat = addr.lat;
      out.lng = addr.lng;
    }
  }

  return Object.keys(out).length ? out : null;
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
 * Start Google OAuth: returns Google authorize URL (POST /api/oauth/sign-in/social, disableRedirect: true).
 */
export async function startGoogleOAuth(callbackFullUrl, shopId) {
  const json = await apiFetch('/oauth/sign-in/social', {
    method: 'POST',
    body: {
      provider: 'google',
      disableRedirect: true,
      callbackURL: callbackFullUrl,
      additionalData: shopId ? { shopId } : {},
    },
    credentials: 'include',
    omitTenantHeader: true,
    returnResponse: true,
  });
  const url = json?.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Google sign-in did not return an authorize URL.');
  }
  return url;
}

/**
 * Exchange OAuth cookie for JWT (POST /api/auth/oauth/jwt). Call from OAuth return page with credentials.
 */
export async function exchangeOAuthJwt(shopId) {
  return apiFetch('/auth/oauth/jwt', {
    method: 'POST',
    body: shopId ? { shopId } : {},
    credentials: 'include',
    omitTenantHeader: true,
    returnResponse: true,
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
 * POST /storefront/profile — update display name and/or phone (204). Requires `NEXT_PUBLIC_SHOP_ID` + `x-shop-id`.
 */
export async function updateStorefrontProfile({ displayName, phone } = {}) {
  const shopId = await resolveShopId();
  if (!shopId) return;

  const body = {};
  if (displayName !== undefined) {
    const d = String(displayName).trim();
    if (d) body.displayName = d;
  }
  if (phone !== undefined) {
    const p = normalizeOtpPhone(phone);
    if (p) body.phone = p;
  }
  if (Object.keys(body).length === 0) return;

  await apiFetchRoot('/storefront/profile', {
    method: 'POST',
    headers: { 'x-shop-id': shopId },
    omitTenantHeader: true,
    body,
  });

  // Storefront profile may not reflect in GET /api/me/profile; keep UI consistent client-side.
  if (typeof window !== 'undefined') {
    try {
      const currentTxt = window.localStorage.getItem('user');
      const current = currentTxt ? JSON.parse(currentTxt) : {};
      const next = {
        ...(current && typeof current === 'object' ? current : {}),
        ...(body.displayName ? { name: body.displayName, displayName: body.displayName } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
      };
      window.localStorage.setItem('user', JSON.stringify(next));
    } catch {
      // ignore storage write failures
    }
  }
}

/**
 * PATCH /api/me/profile (never POST) + optional POST /storefront/profile for shop context.
 * PATCH body: only `name`, `displayName`, `email`, `phone`, `address` (strict). We send `displayName` for display name (not both name + displayName).
 * 200 response = same shape as GET — used as source of truth when returned.
 *
 * @param {object} profileData - `name` or `displayName`, `phone`, `email`, optional `address`
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
    if (profileData.phone !== undefined) {
      if (profileData.phone === null || profileData.phone === '') {
        patchBody.phone = null;
      } else {
        const p = normalizeOtpPhone(profileData.phone) || String(profileData.phone).replace(/\s/g, '');
        patchBody.phone = p || null;
      }
    }
    if (profileData.address && typeof profileData.address === 'object') {
      const mapped = mapAppAddressToMeProfileAddress(profileData.address);
      if (mapped && Object.keys(mapped).length > 0) patchBody.address = mapped;
    }

    let normalizedFromPatch = null;
    if (Object.keys(patchBody).length > 0) {
      const raw = await api.patch('/me/profile', patchBody);
      normalizedFromPatch = normalizeCustomerFromMeProfile(raw);
    }

    await updateStorefrontProfile({
      displayName: displayName !== undefined ? String(displayName).trim() : undefined,
      phone: profileData.phone !== undefined ? profileData.phone : undefined,
    });

    if (normalizedFromPatch) return normalizedFromPatch;
    return getCurrentUser();
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
    const response = await apiFetchRoot('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
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
