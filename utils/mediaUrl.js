import { getApiOrigin } from './apiClient';

/** Default public CDN for storefront blob keys when env is unset (matches storefrontYaadroCatalog). */
const DEFAULT_MEDIA_CDN = 'https://media.yaadro.online';

/**
 * Convert a backend media `storageKey` (e.g. "shared/blobs/...") into a URL the browser can load.
 *
 * Prefer env:
 * - OBJECT_STORAGE_PUBLIC_BASE_URL
 * - NEXT_PUBLIC_MEDIA_BASE_URL
 * - NEXT_PUBLIC_MEDIA_ORIGIN
 *
 * When unset, use the Yaadro media CDN — API origin does not serve `/shared/blobs/*`.
 */
export function storageKeyToUrl(storageKey) {
  if (!storageKey) return null;
  const key = String(storageKey).trim().replace(/^\/+/, '');
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;

  const base = (
    process.env.OBJECT_STORAGE_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    process.env.NEXT_PUBLIC_MEDIA_ORIGIN ||
    DEFAULT_MEDIA_CDN
  )
    .trim()
    .replace(/\/+$/, '');

  if (base) {
    return `${base}/${key}`;
  }

  // Last resort (usually wrong for blobs — kept for exotic local setups)
  const origin = getApiOrigin();
  return origin ? `${origin.replace(/\/+$/, '')}/${key}` : `/${key}`;
}

export function mediaObjectToUrl(media) {
  if (!media || typeof media !== 'object') return null;
  // Newer API responses may already include a fully-qualified URL.
  if (typeof media.url === 'string' && media.url.trim()) return media.url.trim();
  return storageKeyToUrl(media.storageKey);
}

