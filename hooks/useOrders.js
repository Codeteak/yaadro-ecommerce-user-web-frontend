/**
 * TanStack Query hooks for Orders
 */

import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { listOrders, getOrder } from '../utils/orderApi';

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
 * Orders list. API has no cursor; fetches newest `limit` orders (max 100).
 */
export function useInfiniteOrdersList(params = {}, queryOptions = {}) {
  const { enabled = true, ...rest } = queryOptions;
  const limit = Math.min(100, Math.max(1, Number(params.limit ?? params.per_page) || 50));
  const filters = { limit };

  return useInfiniteQuery({
    queryKey: orderKeys.infinite(filters),
    initialPageParam: 1,
    queryFn: () => listOrders({ limit }),
    getNextPageParam: () => undefined,
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
