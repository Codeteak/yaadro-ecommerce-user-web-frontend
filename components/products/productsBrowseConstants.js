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
