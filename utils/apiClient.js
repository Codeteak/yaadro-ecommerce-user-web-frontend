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

const FALLBACK_BASE_URL = 'http://localhost:3001/api';

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
  // Static S3/CloudFront deploy has no Next.js API routes, so browser-side API logs stay in console only.
}

function getConfiguredBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : '') ||
    FALLBACK_BASE_URL;

  return String(base).replace(/\/+$/, '');
}

/** API host without `/api` (for routes mounted at root, e.g. `POST /auth/logout`). */
export function getApiOrigin() {
  return getConfiguredBaseUrl().replace(/\/?api\/?$/, '');
}

function toRootUrl(path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${getApiOrigin()}${normalizedPath}`);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
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

function toUrl(path, query) {
  const base = getConfiguredBaseUrl();
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
 */
export async function apiFetch(path, options = {}) {
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
    ...rest
  } = options;

  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const resolvedTenant = omitTenantHeader ? '' : tenantId ?? getTenantId();
  const resolvedToken = token ?? getAuthToken();

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

  const url = toUrl(path, query);
  const response = await fetch(url, fetchOpts);

  const json = await parseJsonSafe(response);
  const apiStatus = json?.status;
  const apiMessage = json?.message;

  if (!response.ok || apiStatus === 'error') {
    const message = apiMessage || resolveErrorMessage(json, response);
    const err = new Error(typeof message === 'string' ? message : String(message));
    err.status = response.status;
    err.data = json;
    throw err;
  }

  if (isApiLoggingEnabled()) {
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ms = Math.round((endedAt - startedAt) * 10) / 10;
    const line = `[API] ${method} ${url} -> ${response.status} (${ms}ms)`;
    // Server logs go to terminal; browser logs go to console.
    // For browser, also send to server so it appears in terminal.
    // eslint-disable-next-line no-console
    console.log(line);
    sendClientApiLogToServer({
      kind: 'apiFetch',
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

/**
 * Fetch against API origin without `/api` prefix (e.g. `POST /auth/logout`).
 */
export async function apiFetchRoot(path, options = {}) {
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
    ...rest
  } = options;

  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const resolvedTenant = omitTenantHeader ? '' : tenantId ?? getTenantId();
  const resolvedToken = token ?? getAuthToken();

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

  const url = toRootUrl(path, query);
  const response = await fetch(url, fetchOpts);

  const json = await parseJsonSafe(response);
  const apiStatus = json?.status;
  const apiMessage = json?.message;

  if (!response.ok || apiStatus === 'error') {
    const message = apiMessage || resolveErrorMessage(json, response);
    const err = new Error(typeof message === 'string' ? message : String(message));
    err.status = response.status;
    err.data = json;
    throw err;
  }

  if (isApiLoggingEnabled()) {
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const ms = Math.round((endedAt - startedAt) * 10) / 10;
    const line = `[API] ${method} ${url} -> ${response.status} (${ms}ms)`;
    // eslint-disable-next-line no-console
    console.log(line);
    sendClientApiLogToServer({
      kind: 'apiFetchRoot',
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

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiFetch(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiFetch(path, { ...options, method: 'DELETE' }),
};

