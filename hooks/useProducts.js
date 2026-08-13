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

// Query keys
export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (filters) => [...productKeys.lists(), filters],
  infinite: (filters) => [...productKeys.all, 'infinite', filters],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  search: (query) => [...productKeys.all, 'search', query],
  searchInfinite: (filters) => [...productKeys.all, 'search-infinite', filters],
  categories: () => [...productKeys.all, 'categories'],
  categoryRoots: () => [...productKeys.categories(), 'roots'],
  categoryProducts: (slug) => [...productKeys.all, 'category', slug],
};

const DEFAULT_PAGE_SIZE = 24;

/** Cursor pagination only when sort is created_at (API forces created_at if cursor is sent). */
export function usesCursorPagination(sortBy) {
  return !sortBy || sortBy === 'created_at' || sortBy === 'default';
}

/**
 * Get products with filters
 * @param {object} params — passed to `getProducts` except `enabled` (React Query)
 */
export function useProducts(params = {}) {
  const { enabled = true, ...apiParams } = params;
  return useQuery({
    queryKey: productKeys.list(apiParams),
    queryFn: () => getProducts(apiParams),
    enabled,
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
  const {
    enabled = true,
    limit = DEFAULT_PAGE_SIZE,
    category_id,
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
    search: search || undefined,
    availability: availability || undefined,
    sort_by: sort_by && sort_by !== 'default' ? sort_by : cursorMode ? 'created_at' : undefined,
    sort_order: sort_order || (cursorMode ? 'desc' : undefined),
    mode: cursorMode ? 'cursor' : 'offset',
  };

  return useInfiniteQuery({
    queryKey: productKeys.infinite(filters),
    initialPageParam: cursorMode ? undefined : 0,
    queryFn: ({ pageParam }) => {
      const base = {
        limit: pageSize,
        category_id: filters.category_id,
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
    enabled,
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
 * Warm PDP cache (with-related key used by ProductDetailClient).
 * Safe to call from hover / focus / touch; React Query dedupes in-flight requests.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {object|string|null|undefined} productOrId
 */
export function prefetchProductDetail(queryClient, productOrId) {
  const lookup = resolveProductDetailLookup(productOrId);
  if (!lookup || !queryClient) return undefined;

  return queryClient.prefetchQuery({
    queryKey: [...productKeys.detail(lookup), 'with-related'],
    queryFn: () => getProductWithRelated(lookup),
    staleTime: DETAIL_STALE_MS,
  });
}

/**
 * Get product by ID
 */
export function useProduct(productId) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => getProductById(productId),
    enabled: !!productId,
    staleTime: DETAIL_STALE_MS,
  });
}

/**
 * Get product with related products
 */
export function useProductWithRelated(productId) {
  return useQuery({
    queryKey: [...productKeys.detail(productId), 'with-related'],
    queryFn: () => getProductWithRelated(productId),
    enabled: !!productId,
    staleTime: DETAIL_STALE_MS,
  });
}

/**
 * Search products
 */
export function useSearchProducts(params = {}) {
  const q = params.q != null ? String(params.q).trim() : '';
  const page = params.page ?? 1;
  const perPage = params.per_page ?? params.perPage ?? 24;
  return useQuery({
    queryKey: productKeys.search({ q, page, per_page: perPage }),
    queryFn: () => searchProducts({ ...params, q, page, per_page: perPage }),
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Infinite search results (cursor when sort is created_at / default).
 */
export function useInfiniteSearchProducts(params = {}) {
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
    mode: cursorMode ? 'cursor' : 'offset',
  };

  return useInfiniteQuery({
    queryKey: productKeys.searchInfinite(filters),
    initialPageParam: cursorMode ? undefined : 0,
    queryFn: ({ pageParam }) => {
      const base = {
        q,
        per_page: pageSize,
        category_id: filters.category_id,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
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
    enabled: q.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Get all categories (flat list)
 */
export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Root categories only (single HTTP call — no tree recursion).
 */
export function useRootCategories() {
  return useQuery({
    queryKey: productKeys.categoryRoots(),
    queryFn: () => getRootCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get category tree (nested root categories with children)
 */
export function useCategoriesTree() {
  return useQuery({
    queryKey: [...productKeys.categories(), 'tree'],
    queryFn: () => getCategoriesTree(),
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Get products by category slug
 */
export function useCategoryProducts(categorySlug, params = {}) {
  return useQuery({
    queryKey: productKeys.categoryProducts(categorySlug),
    queryFn: () => getCategoryProducts(categorySlug, params),
    enabled: !!categorySlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
