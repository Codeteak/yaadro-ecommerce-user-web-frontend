/** Coalesce bursty catalog.invalidated events (e.g. PC sync) into one refetch burst. */
import { applyCatalogInvalidated, normalizeCatalogProductIds } from './applyCatalogProductUpdates.js';

const CATALOG_REFETCH_MIN_GAP_MS = 2000;

let lastCatalogRefetchAt = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let catalogRefetchTimer = null;
/** @type {Set<string>} */
let pendingProductIds = new Set();

/**
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {{ shopId?: string, productIds?: string[] | string }} [payload]
 */
export function scheduleCoalescedCatalogRefetch(queryClient, payload) {
  for (const id of normalizeCatalogProductIds(payload?.productIds)) {
    pendingProductIds.add(id);
  }

  const now = Date.now();

  const fire = () => {
    lastCatalogRefetchAt = Date.now();
    const productIds = pendingProductIds.size > 0 ? [...pendingProductIds] : undefined;
    pendingProductIds = new Set();
    void applyCatalogInvalidated(queryClient, { shopId: payload?.shopId, productIds });
  };

  if (now - lastCatalogRefetchAt >= CATALOG_REFETCH_MIN_GAP_MS) {
    if (catalogRefetchTimer) {
      clearTimeout(catalogRefetchTimer);
      catalogRefetchTimer = null;
    }
    fire();
    return;
  }

  if (catalogRefetchTimer) return;

  catalogRefetchTimer = setTimeout(
    () => {
      catalogRefetchTimer = null;
      fire();
    },
    CATALOG_REFETCH_MIN_GAP_MS - (now - lastCatalogRefetchAt)
  );
}

/** @internal test-only */
export function resetCatalogRefetchCoalesceForTests() {
  lastCatalogRefetchAt = 0;
  pendingProductIds = new Set();
  if (catalogRefetchTimer) {
    clearTimeout(catalogRefetchTimer);
    catalogRefetchTimer = null;
  }
}
