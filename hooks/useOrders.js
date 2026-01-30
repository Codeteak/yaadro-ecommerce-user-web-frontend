/**
 * TanStack Query hooks for Orders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder, verifyPayment, listOrders, getOrder, cancelOrder, retryPayment } from '../utils/orderApi';

// Query keys
export const orderKeys = {
  all: ['orders'],
  lists: () => [...orderKeys.all, 'list'],
  list: (filters) => [...orderKeys.lists(), filters],
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
export function useOrdersList(params = {}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => listOrders(params),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Get order details query
 */
export function useOrderDetail(orderId) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
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
