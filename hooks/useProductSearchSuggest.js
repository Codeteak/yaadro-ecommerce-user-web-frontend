import { useMemo } from 'react';
import { useProducts } from './useProducts';
import { buildMiniSearchIndex, runMiniSearch } from '../utils/miniSearchCatalog';

function normalizeId(value) {
  return value != null ? String(value) : '';
}

function dedupeProductsById(products) {
  const seen = new Set();
  const out = [];
  for (const product of Array.isArray(products) ? products : []) {
    const id = normalizeId(product?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(product);
  }
  return out;
}

/**
 * Local typeahead suggestions built from one cached catalog fetch.
 */
export function useProductSearchSuggest(query, options = {}) {
  const {
    enabled = true,
    limit = 8,
    catalogLimit = 50,
  } = options;

  const q = query != null ? String(query).trim() : '';
  const catalogPageSize = Math.min(50, Math.max(1, Number(catalogLimit) || 50));

  const {
    data: firstCatalogPage,
    isLoading: firstLoading,
    isFetching: firstFetching,
  } = useProducts({
    enabled,
    limit: catalogPageSize,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const {
    data: secondCatalogPage,
    isLoading: secondLoading,
    isFetching: secondFetching,
  } = useProducts({
    enabled,
    limit: catalogPageSize,
    offset: catalogPageSize,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const {
    data: liveSearchData,
    isLoading: liveLoading,
    isFetching: liveFetching,
  } = useProducts({
    enabled: enabled && q.length >= 2,
    search: q,
    limit,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const products = useMemo(
    () => dedupeProductsById([
      ...(firstCatalogPage?.products || []),
      ...(secondCatalogPage?.products || []),
    ]),
    [firstCatalogPage?.products, secondCatalogPage?.products]
  );
  const liveProducts = liveSearchData?.products || [];

  const { mini, docsCount } = useMemo(
    () => buildMiniSearchIndex(products),
    [products]
  );

  const suggestions = useMemo(() => {
    const productById = new Map();
    for (const product of products) {
      const id = normalizeId(product?.id);
      if (!id) continue;
      productById.set(id, product);
    }
    for (const product of liveProducts) {
      const id = normalizeId(product?.id);
      if (!id || productById.has(id)) continue;
      productById.set(id, product);
    }

    const miniHits = runMiniSearch(mini, q, limit).map((hit) => {
      const id = normalizeId(hit?.id);
      return {
        ...hit,
        id,
        product: hit?.product || productById.get(id) || null,
      };
    });

    const liveHits = liveProducts.map((product) => {
      const id = normalizeId(product?.id);
      return {
        id,
        name: product?.name || product?.shortName || 'Product',
        category: product?.category || product?.categoryName || '',
        product,
      };
    });

    const merged = [];
    const seen = new Set();
    for (const hit of [...miniHits, ...liveHits]) {
      if (!hit?.id || seen.has(hit.id)) continue;
      seen.add(hit.id);
      merged.push(hit);
      if (merged.length >= Math.max(1, limit)) break;
    }
    return merged;
  }, [mini, q, limit, products, liveProducts]);

  return {
    suggestions,
    products,
    docsCount,
    isLoadingCatalog:
      firstLoading ||
      firstFetching ||
      secondLoading ||
      secondFetching ||
      liveLoading ||
      liveFetching,
  };
}
