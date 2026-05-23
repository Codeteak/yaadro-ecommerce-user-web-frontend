/**
 * API client for multi-tenant backend.
 *
 * - Base URL: http://localhost:3001/api (configurable)
 * - Auth: Authorization: Bearer <token> (optional)
 * - Tenant: X-Tenant-ID: <shop_id_or_shop_code> (required for customer endpoints)
 *
 * Response format:
 * { status: "success"|"error", message?: string, data?: any }
 */

import { getIamsApiBaseUrl, getStorefrontApiBaseUrl } from './apiBases';

function isApiLoggingEnabled() {
  const v = process.env.NEXT_PUBLIC_LOG_API;
  return v === '1' || v === 'true';
}

function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '';
  }
}

function sendClientApiLogToServer(payload) {
  if (typeof window === 'undefined') return;
  if (!isApiLoggingEnabled()) return;
  const body = safeJsonStringify(payload);
  if (!body) return;
  // Static Cloudflare Pages deploy has no Next.js API routes, so browser-side API logs stay in console only.
}

/** @deprecated Use {@link getStorefrontApiBaseUrl} from `./apiBases`. */
function getConfiguredBaseUrl() {
  return getStorefrontApiBaseUrl();
}

/** Storefront API origin without `/api` (static assets, media URLs). */
export function getApiOrigin() {
  return getStorefrontApiBaseUrl().replace(/\/?api\/?$/i, '');
}

function warnIfIamsOnStorefront(fullUrl, label) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
  if (/\/iams\//i.test(fullUrl)) {
    console.warn(
      `[${label}] Request targets /iams/ on the storefront client. Set NEXT_PUBLIC_IAMS_API_BASE_URL and use iamsFetch.`,
      fullUrl
    );
  }
}

function resolveErrorMessage(json, response) {
  if (!json) return `Request failed (${response.status} ${response.statusText})`;
  if (json.message && typeof json.message === 'string') return json.message;
  if (json.error && typeof json.error === 'object' && json.error.message) return json.error.message;
  if (typeof json.error === 'string') return json.error;
  return `Request failed (${response.status} ${response.statusText})`;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getTenantId() {
  const envDefault = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '';

  if (!isBrowser()) return envDefault || '';

  // 1) Explicitly stored tenant
  const stored = window.localStorage.getItem('tenantId') || window.localStorage.getItem('tenant') || '';
  if (stored) return stored;

  // 2) Subdomain-based tenant (production-style)
  // Example: shop1.example.com -> "shop1"
  // Supports: shop1.localhost -> "shop1"
  const host = window.location.hostname || '';
  const parts = host.split('.').filter(Boolean);
  if (parts.length >= 2) {
    const subdomain = parts[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') return subdomain;
  }

  // 3) Fallback to env default (useful for local dev)
  return envDefault || '';
}

export function setTenantId(tenantId) {
  if (!isBrowser()) return;
  if (!tenantId) {
    window.localStorage.removeItem('tenantId');
    return;
  }
  window.localStorage.setItem('tenantId', String(tenantId));
}

export function getAuthToken() {
  if (!isBrowser()) return '';
  return (
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('accessToken') ||
    window.localStorage.getItem('authToken') ||
    ''
  );
}

export function setAuthToken(token) {
  if (!isBrowser()) return;
  if (!token) {
    window.localStorage.removeItem('authToken');
    return;
  }
  window.localStorage.setItem('authToken', String(token));
}

function toUrl(path, query, apiBaseUrl = getStorefrontApiBaseUrl()) {
  const base = apiBaseUrl || getStorefrontApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
  }

  return url.toString();
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Main API fetch helper.
 *
 * @param {string} path - e.g. "/v1/products" or "auth/login"
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {object} [options.headers]
 * @param {object|FormData|string|null} [options.body]
 * @param {object} [options.query]
 * @param {string} [options.token] - Bearer token override (otherwise localStorage)
 * @param {string} [options.tenantId] - Tenant override (otherwise resolved)
 * @param {RequestCredentials} [options.credentials] - use `include` for OAuth cookie exchange (cross-origin API)
 * @param {boolean} [options.omitTenantHeader] - skip X-Tenant-ID (e.g. auth registration)
 * @param {boolean} [options.omitAuthHeader] - skip Authorization (e.g. OTP login while an expired token remains in localStorage)
 */
async function apiFetchWithBase(path, options = {}, apiBaseUrl = getStorefrontApiBaseUrl()) {
  const {
    method = 'GET',
    headers = {},
    body = undefined,
    query = undefined,
    token = undefined,
    tenantId = undefined,
    returnResponse = false,
    credentials,
    omitTenantHeader = false,
    omitAuthHeader = false,
    logKind = 'apiFetch',
    ...rest
  } = options;

  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const resolvedTenant = omitTenantHeader ? '' : tenantId ?? getTenantId();
  const resolvedToken = omitAuthHeader ? '' : token ?? getAuthToken();

  const finalHeaders = new Headers(headers);

  if (resolvedTenant) {
    finalHeaders.set('X-Tenant-ID', resolvedTenant);
  }

  if (resolvedToken) {
    finalHeaders.set('Authorization', `Bearer ${resolvedToken}`);
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const hasBody = body !== undefined && body !== null;
  if (hasBody && !isFormData && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  if (!finalHeaders.has('Accept')) {
    finalHeaders.set('Accept', 'application/json');
  }

  const fetchOpts = {
    method,
    headers: finalHeaders,
    body: hasBody && !isFormData && typeof body !== 'string' ? JSON.stringify(body) : body,
    ...rest,
  };
  if (credentials !== undefined) {
    fetchOpts.credentials = credentials;
  }

  const base = apiBaseUrl || getStorefrontApiBaseUrl();
  const url = toUrl(path, query, base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  warnIfIamsOnStorefront(`${base}${normalizedPath}`, logKind);

  const response = await fetch(url, fetchOpts);

  const json = await parseJsonSafe(response);
  const apiStatus = json?.status;
  const apiMessage = json?.message;

  if (!response.ok || apiStatus === 'error') {
    const message = apiMessage || resolveErrorMessage(json, response);
    const err = new Error(typeof message === 'string' ? message : String(message));
    err.status = response.status;
    err.data = json;
    if (json?.error?.code) err.code = json.error.code;
    throw err;
  }

  if (isApiLoggingEnabled()) {
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ms = Math.round((endedAt - startedAt) * 10) / 10;
    const line = `[API] ${method} ${url} -> ${response.status} (${ms}ms)`;
    // eslint-disable-next-line no-console
    console.log(line);
    sendClientApiLogToServer({
      kind: logKind,
      method,
      url,
      status: response.status,
      ms,
      at: new Date().toISOString(),
    });
  }

  if (returnResponse) return json;

  return apiStatus ? json?.data : json;
}

/** Storefront / customer API (auth, `/me/*`, `/storefront/*`). */
export async function apiFetch(path, options = {}) {
  return apiFetchWithBase(path, options, getStorefrontApiBaseUrl());
}

/**
 * Same host as `apiFetch` — use for `/storefront/*` catalog, cart, checkout, orders.
 * Never point IAMS paths (`/iams/api/...`) here; use {@link iamsFetch}.
 */
export async function storefrontFetch(path, options = {}) {
  return apiFetchWithBase(path, { ...options, logKind: 'storefrontFetch' }, getStorefrontApiBaseUrl());
}

/** @deprecated Alias for {@link storefrontFetch}. */
export const apiFetchRoot = storefrontFetch;

/**
 * IAMS / admin / affiliate API (`NEXT_PUBLIC_IAMS_API_BASE_URL`).
 * Example: `GET /iams/api/v1/high-commissions` — not on the storefront server.
 */
export async function iamsFetch(path, options = {}) {
  const base = getIamsApiBaseUrl();
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_IAMS_API_BASE_URL is not set. IAMS routes cannot be called on the storefront host.'
    );
  }
  return apiFetchWithBase(path, { ...options, logKind: 'iamsFetch' }, base);
}

export { getStorefrontApiBaseUrl, getIamsApiBaseUrl } from './apiBases';

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiFetch(path, { ...options, method: 'DELETE' }),
};

