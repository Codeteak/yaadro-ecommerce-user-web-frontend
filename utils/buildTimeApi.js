/**
 * Helpers for `generateStaticParams` during `next build` (static export).
 * Uses a short timeout and avoids noisy logs when the API / tunnel is down.
 */

import { getStorefrontApiBaseUrl, normalizeApiBaseUrl } from './apiBases';

/** Slugs used when the storefront API is unreachable at build time. */
export const BUILD_FALLBACK_CATEGORY_SLUGS = [
  'all',
  'beverages',
  'rice',
  'cooking-oil',
];

export function getBuildApiBaseUrl() {
  const override = String(process.env.BUILD_API_BASE_URL || '').trim();
  if (override) return normalizeApiBaseUrl(override);
  return getStorefrontApiBaseUrl();
}

export function unwrapApiPayload(json) {
  if (!json || typeof json !== 'object') return json;
  if ('data' in json && json.data && typeof json.data === 'object') return json.data;
  return json;
}

function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** One-line warning during static export; full errors in dev/runtime. */
export function warnBuildApiUnavailable(label, err) {
  if (!isBuildPhase()) {
    console.error(label, err);
    return;
  }
  const status = err?.status ?? err?.cause?.status;
  const hint = status ? ` (HTTP ${status})` : '';
  console.warn(`[build] ${label}: API unreachable${hint}; using fallbacks.`);
}

/**
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [options]
 */
export async function fetchAtBuildTime(url, options = {}) {
  const { timeoutMs = 10_000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Root + one level of child category slugs for static export. */
export async function fetchCategorySlugsAtBuildTime() {
  if (process.env.SKIP_BUILD_API === '1') return [];

  const base = getBuildApiBaseUrl();
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID
    ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim()
    : '';
  const headers = { Accept: 'application/json' };
  if (shopId) headers['x-shop-id'] = shopId;

  const slugs = new Set();

  async function loadLevel(parentId) {
    const qs = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : '';
    const json = unwrapApiPayload(
      await fetchAtBuildTime(`${base}/storefront/categories${qs}`, { headers })
    );
    const list = json?.categories || [];
    if (!Array.isArray(list)) return;

    for (const row of list) {
      const slug = String(row?.slug || row?.id || '').trim();
      if (slug) slugs.add(slug);
      if (row?.id) {
        try {
          await loadLevel(row.id);
        } catch {
          // Skip unreachable subtree; keep slugs we already have.
        }
      }
    }
  }

  await loadLevel(null);
  return [...slugs];
}
