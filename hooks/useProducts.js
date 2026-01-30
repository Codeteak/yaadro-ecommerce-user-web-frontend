/**
 * TanStack Query hooks for Products
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, getProductById, getProductWithRelated, searchProducts, getCategories, getCategoriesTree, getCategoryProducts } from '../utils/productApi';

// Query keys
export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (filters) => [...productKeys.lists(), filters],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  search: (query) => [...productKeys.all, 'search', query],
  categories: () => [...productKeys.all, 'categories'],
  categoryProducts: (slug) => [...productKeys.all, 'category', slug],
};

/**
 * Get products with filters
 */
export function useProducts(params = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => getProducts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Search products
 */
export function useSearchProducts(params = {}) {
  return useQuery({
    queryKey: productKeys.search(params),
    queryFn: () => searchProducts(params),
    enabled: !!(params.q && params.q.trim().length >= 2),
    staleTime: 1000 * 60 * 2, // 2 minutes
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
