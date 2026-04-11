import { getApiOrigin } from './apiClient';

/**
 * Convert a backend media `storageKey` (e.g. "shared/blobs/...") into a URL the browser can load.
 *
 * This storefront API currently returns `{ storageKey, contentType }` but does not expose a
 * documented public route for serving blobs. We therefore support a configurable base URL.
 *
 * Configure one of:
 * - NEXT_PUBLIC_MEDIA_BASE_URL (preferred)
 * - NEXT_PUBLIC_MEDIA_ORIGIN
 *
 * Example (if your infra serves keys directly):
 *   NEXT_PUBLIC_MEDIA_BASE_URL=https://your-cdn.example.com/
 */
export function storageKeyToUrl(storageKey) {
  if (!storageKey) return null;
  const key = String(storageKey).replace(/^\/+/, '');

  const base =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    process.env.NEXT_PUBLIC_MEDIA_ORIGIN ||
    '';

  if (base) {
    return `${String(base).replace(/\/+$/, '')}/${key}`;
  }

  // Fallback: try API origin (may be 404 depending on deployment)
  const origin = getApiOrigin();
  return `${origin}/${key}`;
}

export function mediaObjectToUrl(media) {
  if (!media || typeof media !== 'object') return null;
  // Newer API responses may already include a fully-qualified URL.
  if (typeof media.url === 'string' && media.url) return media.url;
  return storageKeyToUrl(media.storageKey);
}

