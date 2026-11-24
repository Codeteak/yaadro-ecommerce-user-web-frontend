/**
 * Shared catalog browse sizes so home, categories hub, and `/api/warm`
 * hit the same `"use cache"` keys. Changing one without the others
 * wastes warm work (cold shoppers wait again).
 */
export const CATALOG_BROWSE_PAGE_SIZE = 48;
export const CATALOG_BROWSE_MAX_PAGES = 1;
/** Server search may page further than the hub browse sample. */
export const CATALOG_SEARCH_MAX_PAGES = 3;
/** Pause after typing before server search / URL sync. */
export const CATALOG_SEARCH_DEBOUNCE_MS = 350;
/** Minimum characters before a server search runs. */
export const CATALOG_SEARCH_MIN_CHARS = 2;
