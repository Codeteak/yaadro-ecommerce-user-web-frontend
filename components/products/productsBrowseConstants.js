export const SORT_OPTIONS = [
  { key: 'default', label: 'Sort' },
  { key: 'price-asc', label: 'Price: low' },
  { key: 'price-desc', label: 'Price: high' },
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
];

/** `GET /storefront/products` expects `category_id` as UUID only. */
export const CATEGORY_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Unfiltered browse sentinel — not an admin category UUID/name. */
export function isAllCategorySentinel(value) {
  return String(value || '').trim().toLowerCase() === 'all';
}

/** Hide admin roots named/slug "all" so they cannot collide with the sentinel. */
export function isAllNamedCategory(category) {
  if (!category || typeof category !== 'object') return false;
  const name = String(category.name || '').trim().toLowerCase();
  const slug = String(category.slug || '').trim().toLowerCase();
  return name === 'all' || slug === 'all';
}
