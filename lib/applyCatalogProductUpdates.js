/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizeCatalogProductIds(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set(list.map(id => String(id || '').trim()).filter(Boolean))];
}

/**
 * @param {object | null | undefined} old
 * @param {object} updated
 */
function patchProductInQueryData(old, updated) {
  if (!old || !updated?.id) return old;

  if (Array.isArray(old.pages)) {
    let changed = false;
    const pages = old.pages.map(page => {
      if (!page || !Array.isArray(page.products)) return page;
      const products = page.products.map(p => {
        if (p?.id !== updated.id) return p;
        changed = true;
        return { ...p, ...updated };
      });
      return changed ? { ...page, products } : page;
    });
    return changed ? { ...old, pages } : old;
  }

  if (Array.isArray(old.products)) {
    let changed = false;
    const products = old.products.map(p => {
      if (p?.id !== updated.id) return p;
      changed = true;
      return { ...p, ...updated };
    });
    return changed ? { ...old, products } : old;
  }

  if (old.product?.id === updated.id) {
    return { ...old, product: { ...old.product, ...updated } };
  }

  if (old.id === updated.id) {
    return { ...old, ...updated };
  }

  return old;
}

/**
 * Patch list/infinite/detail caches for one product (no full-page refetch).
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {object} product
 */
export function patchProductInCatalogCaches(queryClient, product) {
  if (!product?.id) return;

  const lookups = new Set([String(product.id)]);
  if (product.slug) lookups.add(String(product.slug));

  // Keys are ['products', shopId, 'list'|'infinite'|'detail'|…, …]
  queryClient.setQueriesData(
    {
      predicate: q =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'products' &&
        (q.queryKey[2] === 'infinite' ||
          q.queryKey[2] === 'list' ||
          q.queryKey[2] === 'search-infinite' ||
          q.queryKey[2] === 'category'),
    },
    old => patchProductInQueryData(old, product)
  );

  queryClient.setQueriesData(
    {
      predicate: q => {
        if (
          !Array.isArray(q.queryKey) ||
          q.queryKey[0] !== 'products' ||
          q.queryKey[2] !== 'detail'
        ) {
          return false;
        }
        return lookups.has(String(q.queryKey[3] ?? ''));
      },
    },
    old => patchProductInQueryData(old, product)
  );
}

/** Skip re-fetching IDs that recently 404'd (deleted / inactive during PC sync). */
const MISSING_TTL_MS = 5 * 60 * 1000;
/** @type {Map<string, number>} */
const missingProductUntil = new Map();

const REFRESH_CONCURRENCY = 4;

function rememberMissingProduct(productId) {
  missingProductUntil.set(String(productId), Date.now() + MISSING_TTL_MS);
}

function isKnownMissing(productId) {
  const until = missingProductUntil.get(String(productId));
  if (until == null) return false;
  if (Date.now() > until) {
    missingProductUntil.delete(String(productId));
    return false;
  }
  return true;
}

/**
 * @param {string[]} ids
 * @param {(id: string) => Promise<void>} worker
 * @param {number} concurrency
 */
async function mapPool(ids, worker, concurrency) {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
    while (next < ids.length) {
      const i = next++;
      await worker(ids[i]);
    }
  });
  await Promise.all(runners);
}

/**
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string[]} productIds
 */
export async function refreshCatalogProductsById(queryClient, productIds) {
  const ids = normalizeCatalogProductIds(productIds).filter(id => !isKnownMissing(id));
  if (ids.length === 0) return;

  const { getProductById } = await import('../utils/productApi.js');

  await mapPool(
    ids,
    async productId => {
      try {
        // silent: missing products during catalog sync are expected — do not spam console.
        const product = await getProductById(productId, { silent: true });
        if (product) {
          missingProductUntil.delete(String(productId));
          patchProductInCatalogCaches(queryClient, product);
        } else {
          rememberMissingProduct(productId);
        }
      } catch {
        rememberMissingProduct(productId);
      }
    },
    REFRESH_CONCURRENCY
  );
}

function shouldRefetchQueryKey(queryKey) {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  const root = queryKey[0];
  return root === 'products' || root === 'categories';
}

/**
 * Apply catalog.invalidated — surgical product patch when productIds present,
 * otherwise light active refetch (no reset / no full remount).
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {{ shopId?: string, productIds?: string[] | string }} [payload]
 */
export async function applyCatalogInvalidated(queryClient, payload) {
  const productIds = normalizeCatalogProductIds(payload?.productIds);

  if (productIds.length > 0) {
    await refreshCatalogProductsById(queryClient, productIds);
    return;
  }

  await queryClient.invalidateQueries({
    predicate: q => shouldRefetchQueryKey(q.queryKey),
    refetchType: 'active',
  });
}

/** @internal test-only */
export function __resetMissingProductCacheForTests() {
  missingProductUntil.clear();
}
