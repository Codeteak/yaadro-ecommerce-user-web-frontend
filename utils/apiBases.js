/**
 * API base URL configuration — keep storefront (ecom-client-backend) separate from IAMS/admin.
 *
 * Storefront catalog, cart, checkout, orders:
 *   GET /storefront/products, /storefront/products/{slug}, /storefront/products/id/{uuid}
 *
 * IAMS-only routes (e.g. /iams/api/v1/high-commissions) must use {@link getIamsApiBaseUrl} + `iamsFetch`,
 * never the storefront host.
 */

const STOREFRONT_FALLBACK = 'http://localhost:3001/api';

/** Ensure base ends with exactly one `/api` segment. */
export function normalizeApiBaseUrl(raw, fallback = STOREFRONT_FALLBACK) {
  let trimmed = String(raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) trimmed = String(fallback).trim().replace(/\/+$/, '');
  if (!trimmed) return STOREFRONT_FALLBACK;
  if (trimmed.toLowerCase().endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

/**
 * Storefront / customer API (ecom-client-backend).
 * Prefer `NEXT_PUBLIC_STOREFRONT_API_BASE_URL`; falls back to legacy `NEXT_PUBLIC_API_*`.
 */
export function getStorefrontApiBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_STOREFRONT_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? `${String(process.env.NEXT_PUBLIC_API_URL).trim().replace(/\/+$/, '')}/api`
      : '');

  return normalizeApiBaseUrl(fromEnv, STOREFRONT_FALLBACK);
}

/** IAMS / affiliate / admin API — separate host; empty when not configured. */
export function getIamsApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_IAMS_API_BASE_URL || '';
  if (!raw || !String(raw).trim()) return '';
  return normalizeApiBaseUrl(raw, '');
}

export function getStorefrontApiOrigin() {
  return getStorefrontApiBaseUrl().replace(/\/?api\/?$/i, '');
}
