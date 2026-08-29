/**
 * TanStack Query hooks for Orders
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createOrder, verifyPayment, listOrders, getOrder, cancelOrder, retryPayment } from '../utils/orderApi';
import { useToast } from '../context/ToastContext';

const ORDERS_STALE_MS = 1000 * 90;
const ORDER_DETAIL_STALE_MS = 1000 * 60;

// Query keys
export const orderKeys = {
  all: ['orders'],
  lists: () => [...orderKeys.all, 'list'],
  list: (filters) => [...orderKeys.lists(), filters],
  infinite: (filters) => [...orderKeys.all, 'infinite', filters],
  details: () => [...orderKeys.all, 'detail'],
  detail: (id) => [...orderKeys.details(), id],
};

function invalidateOrderCaches(queryClient, orderId) {
  queryClient.invalidateQueries({ queryKey: [...orderKeys.all, 'infinite'] });
  queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
  }
}

/**
 * Create order mutation
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (orderData) => createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      invalidateOrderCaches(queryClient);
      showToast('Order placed successfully!', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not place order. Please try again.', 'error');
    },
  });
}

/**
 * Verify payment mutation
 */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, paymentData }) => verifyPayment(orderId, paymentData),
    onSuccess: (_data, variables) => {
      invalidateOrderCaches(queryClient, variables.orderId);
      showToast('Payment verified!', 'success');
    },
    onError: (error) => {
      showToast(error?.message || 'Payment verification failed. Please contact support.', 'error');
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
    staleTime: ORDERS_STALE_MS,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
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
    staleTime: ORDERS_STALE_MS,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
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
    staleTime: ORDER_DETAIL_STALE_MS,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    ...rest,
  });
}

/**
 * Cancel order mutation
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, reason }) => cancelOrder(orderId, reason),
    onSuccess: (_data, variables) => {
      invalidateOrderCaches(queryClient, variables.orderId);
      showToast('Order cancelled.', 'info');
    },
    onError: (error) => {
      showToast(error?.message || 'Could not cancel order. Please try again.', 'error');
    },
  });
}

/**
 * Retry payment mutation
 */
export function useRetryPayment() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ orderId, paymentMethod }) => retryPayment(orderId, paymentMethod),
    onSuccess: (_data, variables) => {
      invalidateOrderCaches(queryClient, variables.orderId);
    },
    onError: (error) => {
      showToast(error?.message || 'Could not retry payment. Please try again.', 'error');
    },
  });
}
