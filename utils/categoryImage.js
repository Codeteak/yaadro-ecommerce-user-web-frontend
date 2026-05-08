import { mediaObjectToUrl } from './mediaUrl';

const DUMMY_CATEGORY_IMAGE = '/icons/dummy-category-card-icon.png';

function isUsableUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  );
}

/**
 * Best-effort resolver that handles the many shapes the backend returns the
 * category image under: image.url / image (string) / imageUrl / image_url /
 * photo.* / icon.* / mediaObject {storageKey}.
 *
 * @param {object|string|null|undefined} category
 * @returns {string|null} URL or null when no usable image is found.
 */
export function getCategoryImageUrl(category) {
  if (!category || typeof category !== 'object') return null;

  const fromImageObj =
    (category.image && typeof category.image === 'object' && category.image.url) ||
    (category.photo && typeof category.photo === 'object' && category.photo.url) ||
    (category.icon && typeof category.icon === 'object' && category.icon.url) ||
    null;

  const fromMediaShape =
    (category.image &&
      typeof category.image === 'object' &&
      mediaObjectToUrl(category.image)) ||
    (category.photo &&
      typeof category.photo === 'object' &&
      mediaObjectToUrl(category.photo)) ||
    (category.icon &&
      typeof category.icon === 'object' &&
      mediaObjectToUrl(category.icon)) ||
    null;

  const candidates = [
    fromImageObj,
    typeof category.image === 'string' ? category.image : null,
    category.imageUrl,
    category.image_url,
    typeof category.photo === 'string' ? category.photo : null,
    category.photoUrl,
    category.photo_url,
    typeof category.icon === 'string' ? category.icon : null,
    category.iconUrl,
    category.icon_url,
    fromMediaShape,
  ];

  for (const candidate of candidates) {
    if (isUsableUrl(candidate)) return candidate;
  }
  return null;
}

export const CATEGORY_DUMMY_IMAGE = DUMMY_CATEGORY_IMAGE;
