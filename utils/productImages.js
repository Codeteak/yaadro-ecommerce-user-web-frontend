import { mediaObjectToUrl } from './mediaUrl';

/** Neutral placeholder when no valid image references exist or load fails. */
export const PRODUCT_IMAGE_PLACEHOLDER = '/images/dummy.png';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Whether a trimmed segment is allowed as an image reference:
 * absolute http(s), protocol-relative `//`, site-relative `/…`, or bare media UUID.
 */
export function isValidImageReference(segment) {
  const t = String(segment ?? '').trim();
  if (!t) return false;
  if (/^https?:\/\//i.test(t)) return true;
  if (t.startsWith('//') && t.length > 2) return true;
  if (t.startsWith('/') && !t.startsWith('//')) return true;
  if (UUID_RE.test(t)) return true;
  return false;
}

/** Normalize `//host/...` to `https://host/...` for browser `src`. */
export function toImageSrcString(ref) {
  const t = String(ref ?? '').trim();
  if (!t) return '';
  if (t.startsWith('//')) return `https:${t}`;
  return t;
}

/**
 * Split `imageUrl` on commas, trim segments, drop empties (no commas → one segment).
 * @param {unknown} imageUrl
 * @returns {string[]}
 */
export function parseCommaSeparatedImageUrl(imageUrl) {
  if (imageUrl == null) return [];
  if (typeof imageUrl !== 'string') return [];
  return imageUrl
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function sortImageRecords(entries) {
  if (!Array.isArray(entries)) return [];
  return [...entries].sort((a, b) => {
    const ao =
      typeof a === 'object' && a && !Array.isArray(a) ? Number(a.sortOrder ?? a.sort_order ?? 0) : 0;
    const bo =
      typeof b === 'object' && b && !Array.isArray(b) ? Number(b.sortOrder ?? b.sort_order ?? 0) : 0;
    return ao - bo;
  });
}

function urlFromAnyImageItem(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'object') {
    if (typeof item.url === 'string' && item.url.trim()) return item.url.trim();
    return mediaObjectToUrl(item) || '';
  }
  return '';
}

function pushAnyPossiblyCommaSeparated(push, raw) {
  const str = typeof raw === 'string' ? raw : '';
  if (!str) return;
  // Some backends send multiple URLs as a single comma-separated string.
  const segments = str.includes(',') ? parseCommaSeparatedImageUrl(str) : [str.trim()];
  for (const seg of segments) push(seg);
}

/**
 * Ordered, deduplicated list: thumbnail first → `imageUrl` comma segments → `images[]` → legacy `image`.
 * @param {object} [input]
 * @param {string} [input.imageUrl]
 * @param {string} [input.image_url]
 * @param {unknown[]} [input.images]
 * @param {object|string} [input.thumbnail]
 * @param {string} [input.thumbnailUrl]
 * @param {string} [input.image]
 * @returns {string[]} display-ready `src` strings
 */
export function normalizeProductImages(input = {}) {
  const ordered = [];
  const seen = new Set();

  const push = (raw) => {
    const u = toImageSrcString(raw);
    if (!u || !isValidImageReference(u)) return;
    const key = u.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(u);
  };

  const thumbStr =
    (typeof input.thumbnailUrl === 'string' && input.thumbnailUrl.trim()) ||
    mediaObjectToUrl(input.thumbnail) ||
    '';
  if (thumbStr) pushAnyPossiblyCommaSeparated(push, thumbStr);

  for (const seg of parseCommaSeparatedImageUrl(input.imageUrl ?? input.image_url)) {
    push(seg);
  }

  for (const item of sortImageRecords(input.images)) {
    const u = urlFromAnyImageItem(item);
    if (u) pushAnyPossiblyCommaSeparated(push, u);
  }

  if (typeof input.image === 'string' && input.image.trim()) {
    pushAnyPossiblyCommaSeparated(push, input.image.trim());
  }

  return ordered;
}

/**
 * Resolved gallery for a storefront `product` object (uses `imageUrls` from API transform when present).
 * @param {object|null|undefined} product
 * @returns {string[]}
 */
export function getResolvedProductImageUrls(product) {
  if (!product || typeof product !== 'object') return [PRODUCT_IMAGE_PLACEHOLDER];
  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    const mapped = product.imageUrls.map((u) => toImageSrcString(u)).filter(Boolean);
    if (mapped.length > 0) return mapped;
  }
  const list = normalizeProductImages({
    imageUrl: product.imageUrl ?? product.image_url,
    images: product.images,
    thumbnail: product.thumbnail,
    thumbnailUrl: product.thumbnailUrl,
    image: product.image,
  });
  return list.length > 0 ? list : [PRODUCT_IMAGE_PLACEHOLDER];
}

/**
 * One display `src` for a cart line (local optimistic shape or API cart row).
 * Merges nested `product` over the line so thumbnails win over stale/dummy `item.image`.
 */
export function getCartLinePreviewImageSrc(item) {
  if (!item || typeof item !== 'object') return PRODUCT_IMAGE_PLACEHOLDER;

  const productObj =
    item.product && typeof item.product === 'object' && !Array.isArray(item.product)
      ? item.product
      : {};

  const merged = { ...item, ...productObj };

  const urls = getResolvedProductImageUrls(merged);
  const best = urls.find((u) => u && u !== PRODUCT_IMAGE_PLACEHOLDER);
  if (best) return best;

  const snapshotKeys = [
    'image_snapshot',
    'image_snapshot_url',
    'image_url_snapshot',
    'product_image_url',
    'thumbnail_url',
    'thumbnail_snapshot',
    'cover_image_url',
    'primary_image_url',
    'picture_url',
    'photo_url',
  ];
  for (const k of snapshotKeys) {
    const raw = item[k];
    if (typeof raw === 'string' && raw.trim()) {
      const u = toImageSrcString(raw.trim());
      if (isValidImageReference(u)) return u;
    }
  }

  const thumb =
    (typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.trim()) ||
    mediaObjectToUrl(item.thumbnail) ||
    '';
  if (thumb) {
    const u = toImageSrcString(thumb);
    if (isValidImageReference(u)) return u;
  }

  const imgField =
    typeof item.image === 'object' && item.image && typeof item.image.url === 'string'
      ? item.image.url
      : typeof item.image === 'string'
        ? item.image
        : '';
  if (imgField && imgField.trim()) {
    const u = toImageSrcString(imgField.trim());
    if (isValidImageReference(u) && u !== PRODUCT_IMAGE_PLACEHOLDER) return u;
  }

  return PRODUCT_IMAGE_PLACEHOLDER;
}
