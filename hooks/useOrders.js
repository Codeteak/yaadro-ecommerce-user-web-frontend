/**
 * TanStack Query hooks for Orders
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder, verifyPayment, listOrders, getOrder, cancelOrder, retryPayment } from '../utils/orderApi';

// Query keys
export const orderKeys = {
  all: ['orders'],
  lists: () => [...orderKeys.all, 'list'],
  list: (filters) => [...orderKeys.lists(), filters],
  infinite: (filters) => [...orderKeys.all, 'infinite', filters],
  details: () => [...orderKeys.all, 'detail'],
  detail: (id) => [...orderKeys.details(), id],
};

/**
 * Create order mutation
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData) => createOrder(orderData),
    onSuccess: () => {
      // Invalidate cart after order creation
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      console.error('Error creating order:', error);
    },
  });
}

/**
 * Verify payment mutation
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentData }) => verifyPayment(orderId, paymentData),
    onSuccess: (data, variables) => {
      // Invalidate order details
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      console.error('Error verifying payment:', error);
    },
  });
}

/**
 * List orders query
 */
export function useOrdersList(params = {}, queryOptions = {}) {
  const { enabled = true, ...rest } = queryOptions;
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => listOrders(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    enabled,
    ...rest,
  });
}

/**
 * Infinite orders list (page/per_page). Handles APIs that return a full dump by
 * client-slicing subsequent pages from the first response.
 */
export function useInfiniteOrdersList(params = {}, queryOptions = {}) {
  const queryClient = useQueryClient();
  const { enabled = true, ...rest } = queryOptions;
  const perPage = Math.min(100, Math.max(1, Number(params.per_page) || 20));
  const filters = { per_page: perPage };
  const key = orderKeys.infinite(filters);

  return useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = pageParam || 1;
      if (page > 1) {
        const existing = queryClient.getQueryData(key);
        const first = existing?.pages?.[0];
        const all = first?.pagination?._allOrders;
        if (first?.pagination?.clientSlice && Array.isArray(all)) {
          const start = (page - 1) * perPage;
          return {
            orders: all.slice(start, start + perPage),
            pagination: {
              page,
              per_page: perPage,
              total: all.length,
              total_pages: Math.max(1, Math.ceil(all.length / perPage)),
              clientSlice: true,
            },
          };
        }
      }
      return listOrders({ page, per_page: perPage });
    },
    getNextPageParam: (lastPage) => {
      const pag = lastPage?.pagination;
      if (!pag) return undefined;
      const page = Number(pag.page) || 1;
      const totalPages = Number(pag.total_pages) || 1;
      if (page >= totalPages) return undefined;
      return page + 1;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled,
    ...rest,
  });
}

/**
 * Get order details query
 */
export function useOrderDetail(orderId, queryOptions = {}) {
  const { enabled: enabledOpt = true, ...rest } = queryOptions;
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: !!orderId && enabledOpt,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    ...rest,
  });
}

/**
 * Cancel order mutation
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }) => cancelOrder(orderId, reason),
    onSuccess: (data, variables) => {
      // Invalidate order details
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      console.error('Error cancelling order:', error);
    },
  });
}

/**
 * Retry payment mutation
 */
export function useRetryPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, paymentMethod }) => retryPayment(orderId, paymentMethod),
    onSuccess: (data, variables) => {
      // Invalidate order details to get updated payment info
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
    onError: (error) => {
      console.error('Error retrying payment:', error);
    },
  });
}
