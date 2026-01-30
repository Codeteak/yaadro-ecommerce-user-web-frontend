/**
 * TanStack Query hooks for Cart
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart as apiAddToCart, updateCartItem, removeFromCart as apiRemoveFromCart, clearCart as apiClearCart } from '../utils/cartApi';

// Query keys
export const cartKeys = {
  all: ['cart'],
  cart: () => [...cartKeys.all],
};

/**
 * Get current user's cart
 */
export function useCartQuery() {
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => getCart(),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Add item to cart mutation
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }) => apiAddToCart(productId, quantity),
    onSuccess: () => {
      // Invalidate and refetch cart
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
    },
    onError: (error) => {
      console.error('Error adding to cart:', error);
    },
  });
}

/**
 * Update cart item quantity mutation
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }) => updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
    },
  });
}

/**
 * Remove item from cart mutation
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId) => apiRemoveFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
    },
  });
}

/**
 * Clear cart mutation
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      queryClient.setQueryData(cartKeys.cart(), { items: [], subtotal: 0, total: 0 });
    },
  });
}
