/**
 * Shared catalog browse sizes so home, categories hub, and `/api/warm`
 * hit the same `"use cache"` keys. Changing one without the others
 * wastes warm work (cold shoppers wait again).
 */
export const CATALOG_BROWSE_PAGE_SIZE = 48;
export const CATALOG_BROWSE_MAX_PAGES = 1;
/**
 * After the uncategoized browse seed, optionally PLP-fill empty root rails.
 * Cap concurrency / count so cold `/home` stays pool-safe for every shop.
 */
export const HOME_ROOT_FETCH_CONCURRENCY = 2;
/** Max empty roots to soft-fill with categoryId (rest rely on lazy aisle load). */
export const HOME_ROOT_PLP_FILL_MAX = 8;
/** Server search may page further than the hub browse sample. */
export const CATALOG_SEARCH_MAX_PAGES = 3;
/** Pause after typing before server search / URL sync. */
export const CATALOG_SEARCH_DEBOUNCE_MS = 350;
/** Minimum characters before a server search runs. */
export const CATALOG_SEARCH_MIN_CHARS = 2;
