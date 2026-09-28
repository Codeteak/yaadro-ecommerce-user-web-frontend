/** Coalesce bursty catalog.invalidated events (e.g. PC sync) into one refetch burst. */
import {
  applyCatalogInvalidated,
  normalizeCatalogProductIds,
} from './applyCatalogProductUpdates.js';

const CATALOG_REFETCH_MIN_GAP_MS = 4000;
/** Cap IDs per fire so a huge sync burst cannot open dozens of parallel GETs. */
const MAX_IDS_PER_BURST = 40;

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
    let productIds;
    if (pendingProductIds.size > 0) {
      const all = [...pendingProductIds];
      pendingProductIds = new Set();
      // Prefer a bounded slice; leftover IDs stay queued for the next gap.
      if (all.length > MAX_IDS_PER_BURST) {
        productIds = all.slice(0, MAX_IDS_PER_BURST);
        for (const id of all.slice(MAX_IDS_PER_BURST)) {
          pendingProductIds.add(id);
        }
      } else {
        productIds = all;
      }
    }
    void applyCatalogInvalidated(queryClient, { shopId: payload?.shopId, productIds }).then(() => {
      if (pendingProductIds.size > 0 && !catalogRefetchTimer) {
        catalogRefetchTimer = setTimeout(() => {
          catalogRefetchTimer = null;
          fire();
        }, CATALOG_REFETCH_MIN_GAP_MS);
      }
    });
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
