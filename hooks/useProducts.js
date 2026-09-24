/**
 * TanStack Query hooks for Products
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  getProductById,
  getProductWithRelated,
  searchProducts,
  getCategories,
  getCategoriesTree,
  getRootCategories,
  getCategoryProducts,
  resolveProductDetailSegment,
} from '../utils/productApi';
import { useShopBranding } from '../context/ShopBrandingContext';
import { useStorefrontShopGate } from './useStorefrontShopGate';

// Query keys — shopId is required so a sticky wrong tenant cannot reuse empty cache.
export const productKeys = {
  all: ['products'],
  shop: (shopId) => [...productKeys.all, shopId || ''],
  lists: (shopId) => [...productKeys.shop(shopId), 'list'],
  list: (shopId, filters) => [...productKeys.lists(shopId), filters],
  infinite: (shopId, filters) => [...productKeys.shop(shopId), 'infinite', filters],
  details: (shopId) => [...productKeys.shop(shopId), 'detail'],
  detail: (shopId, id) => [...productKeys.details(shopId), id],
  search: (shopId, query) => [...productKeys.shop(shopId), 'search', query],
  searchInfinite: (shopId, filters) => [
    ...productKeys.shop(shopId),
    'search-infinite',
    filters,
  ],
  categories: (shopId) => [...productKeys.shop(shopId), 'categories'],
  categoryRoots: (shopId) => [...productKeys.categories(shopId), 'roots'],
  categoryProducts: (shopId, slug) => [...productKeys.shop(shopId), 'category', slug],
};

const DEFAULT_PAGE_SIZE = 24;

/** Cursor pagination only when sort is created_at (API forces created_at if cursor is sent). */
export function usesCursorPagination(sortBy) {
  return !sortBy || sortBy === 'created_at' || sortBy === 'default';
}

function useResolvedShopId() {
  const { shopId } = useShopBranding();
  return shopId || '';
}

/**
 * Get products with filters
 * @param {object} params — passed to `getProducts` except `enabled` (React Query)
 */
export function useProducts(params = {}) {
  const shopId = useResolvedShopId();
  const { enabled = true, ...apiParams } = params;
  const { ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: productKeys.list(shopId, apiParams),
    queryFn: () => getProducts(apiParams),
    enabled: enabled && ready,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Infinite product list (cursor for created_at / default; offset for price sorts).
 * @param {object} params
 * @param {boolean} [params.enabled]
 * @param {number} [params.limit]
 * @param {string} [params.category_id]
 * @param {string} [params.search]
 * @param {string} [params.availability]
 * @param {string} [params.sort_by]
 * @param {string} [params.sort_order]
 */
export function useInfiniteProducts(params = {}) {
  const shopId = useResolvedShopId();
  const {
    enabled = true,
    limit = DEFAULT_PAGE_SIZE,
    category_id,
    include_descendants,
    search,
    availability,
    sort_by,
    sort_order,
  } = params;

  const pageSize = Math.min(50, Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE));
  const cursorMode = usesCursorPagination(sort_by);

  const filters = {
    limit: pageSize,
    category_id: category_id || undefined,
    include_descendants: include_descendants || undefined,
    search: search || undefined,
    availability: availability || undefined,
    sort_by: sort_by && sort_by !== 'default' ? sort_by : cursorMode ? 'created_at' : undefined,
    sort_order: sort_order || (cursorMode ? 'desc' : undefined),
    mode: cursorMode ? 'cursor' : 'offset',
  };

  const { ready } = useStorefrontShopGate();

  return useInfiniteQuery({
    queryKey: productKeys.infinite(shopId, filters),
    initialPageParam: cursorMode ? undefined : 0,
    queryFn: ({ pageParam }) => {
      const base = {
        limit: pageSize,
        category_id: filters.category_id,
        include_descendants: filters.include_descendants,
        search: filters.search,
        availability: filters.availability,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      };
      if (cursorMode) {
        return getProducts({
          ...base,
          cursor: pageParam || undefined,
        });
      }
      return getProducts({
        ...base,
        offset: pageParam ?? 0,
      });
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (cursorMode) {
        const next = lastPage?.pagination?.nextCursor;
        return next != null && String(next).trim() ? String(next).trim() : undefined;
      }
      const count = Array.isArray(lastPage?.products) ? lastPage.products.length : 0;
      if (count < pageSize) return undefined;
      const prev = typeof lastPageParam === 'number' ? lastPageParam : 0;
      return prev + pageSize;
    },
    enabled: enabled && ready,
    staleTime: 1000 * 60 * 5,
  });
}

const DETAIL_STALE_MS = 1000 * 60 * 5;

/**
 * Lookup segment used for PDP route + React Query detail keys (slug preferred).
 * @param {object|string|null|undefined} productOrId
 */
export function resolveProductDetailLookup(productOrId) {
  if (productOrId == null) return '';
  if (typeof productOrId === 'string' || typeof productOrId === 'number') {
    return String(productOrId).trim();
  }
  if (typeof productOrId !== 'object') return '';
  return (
    resolveProductDetailSegment(productOrId) ||
    (productOrId.id != null ? String(productOrId.id).trim() : '')
  );
}

/**
 * Warm PDP product cache (product-only — related loads after first paint).
 * Safe to call from hover / focus / touch; React Query dedupes in-flight requests.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {object|string|null|undefined} productOrId
 * @param {string} [shopId]
 */
export function prefetchProductDetail(queryClient, productOrId, shopId = '') {
  const lookup = resolveProductDetailLookup(productOrId);
  if (!lookup || !queryClient) return undefined;

  return queryClient.prefetchQuery({
    queryKey: productKeys.detail(shopId, lookup),
    queryFn: () => getProductById(lookup),
    staleTime: DETAIL_STALE_MS,
  });
}

/**
 * Get product by ID (critical path for PDP first paint).
 */
export function useProduct(productId) {
  const { shopId, ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: productKeys.detail(shopId, productId),
    queryFn: () => getProductById(productId),
    enabled: !!productId && ready,
    staleTime: DETAIL_STALE_MS,
  });
}

/**
 * Same-category related products — enable only after product (and category) is known.
 */
export function useRelatedProducts(categoryId, excludeProductId, options = {}) {
  const { enabled = true, limit = 12 } = options;
  const cat = categoryId != null ? String(categoryId).trim() : '';
  return useProducts({
    category_id: cat || undefined,
    limit,
    per_page: limit,
    layout: 'flat',
    enabled: enabled && !!cat,
  });
}

/**
 * Get product with related products (legacy combined helper — e.g. order page).
 */
export function useProductWithRelated(productId) {
  const { shopId, ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: [...productKeys.detail(shopId, productId), 'with-related'],
    queryFn: () => getProductWithRelated(productId),
    enabled: !!productId && ready,
    staleTime: DETAIL_STALE_MS,
  });
}

/**
 * Search products
 */
export function useSearchProducts(params = {}) {
  const shopId = useResolvedShopId();
  const q = params.q != null ? String(params.q).trim() : '';
  const page = params.page ?? 1;
  const perPage = params.per_page ?? params.perPage ?? 24;
  const search_mode = params.search_mode === 'contains' ? 'contains' : 'prefix';
  const { ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: productKeys.search(shopId, { q, page, per_page: perPage, search_mode }),
    queryFn: () => searchProducts({ ...params, q, page, per_page: perPage, search_mode }),
    enabled: q.length >= 2 && ready,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Infinite search results (cursor when sort is created_at / default).
 */
export function useInfiniteSearchProducts(params = {}) {
  const shopId = useResolvedShopId();
  const q = params.q != null ? String(params.q).trim() : '';
  const perPage = params.per_page ?? params.perPage ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(50, Math.max(1, Number(perPage) || DEFAULT_PAGE_SIZE));
  const sort_by = params.sort_by;
  const sort_order = params.sort_order;
  const cursorMode = usesCursorPagination(sort_by);

  const filters = {
    q,
    per_page: pageSize,
    category_id: params.category_id || undefined,
    sort_by: sort_by && sort_by !== 'default' ? sort_by : cursorMode ? 'created_at' : undefined,
    sort_order: sort_order || (cursorMode ? 'desc' : undefined),
    search_mode: params.search_mode === 'contains' ? 'contains' : 'prefix',
    mode: cursorMode ? 'cursor' : 'offset',
  };

  const { ready } = useStorefrontShopGate();

  return useInfiniteQuery({
    queryKey: productKeys.searchInfinite(shopId, filters),
    initialPageParam: cursorMode ? undefined : 0,
    queryFn: ({ pageParam }) => {
      const base = {
        q,
        per_page: pageSize,
        category_id: filters.category_id,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
        search_mode: filters.search_mode,
      };
      if (cursorMode) {
        return searchProducts({ ...base, cursor: pageParam || undefined });
      }
      return searchProducts({ ...base, offset: pageParam ?? 0 });
    },
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (cursorMode) {
        const next = lastPage?.pagination?.nextCursor;
        return next != null && String(next).trim() ? String(next).trim() : undefined;
      }
      const count = Array.isArray(lastPage?.products) ? lastPage.products.length : 0;
      if (count < pageSize) return undefined;
      const prev = typeof lastPageParam === 'number' ? lastPageParam : 0;
      return prev + pageSize;
    },
    enabled: q.length >= 2 && ready,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get all categories (flat list)
 */
export function useCategories() {
  const { shopId, ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: productKeys.categories(shopId),
    queryFn: () => getCategories(),
    enabled: ready,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Root categories only (single HTTP call — no tree recursion).
 */
export function useRootCategories(options = {}) {
  const { enabled = true } = options;
  const { shopId, ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: productKeys.categoryRoots(shopId),
    queryFn: () => getRootCategories(),
    enabled: enabled && ready,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get category tree (nested root categories with children)
 * @param {{ enabled?: boolean }} [options]
 */
export function useCategoriesTree(options = {}) {
  const { enabled = true } = options;
  const { shopId, ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: [...productKeys.categories(shopId), 'tree'],
    queryFn: () => getCategoriesTree(),
    enabled: enabled && ready,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get products by category slug
 */
export function useCategoryProducts(categorySlug, params = {}) {
  const { shopId, ready } = useStorefrontShopGate();
  return useQuery({
    queryKey: productKeys.categoryProducts(shopId, categorySlug),
    queryFn: () => getCategoryProducts(categorySlug, params),
    enabled: !!categorySlug && ready,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
