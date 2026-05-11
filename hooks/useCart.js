/**
 * TanStack Query hooks for Cart
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart as apiAddToCart, updateCartItem, removeFromCart as apiRemoveFromCart, clearCart as apiClearCart } from '../utils/cartApi';

function sumLineTotals(items) {
  const list = Array.isArray(items) ? items : [];
  return list.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
}

// Query keys
export const cartKeys = {
  all: ['cart'],
  cart: () => [...cartKeys.all],
};

/**
 * Get current user's cart
 */
export function useCartQuery(options = {}) {
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => getCart(),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    ...options,
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
    onSuccess: (data, variables) => {
      queryClient.setQueryData(cartKeys.cart(), (old) => {
        if (!old || !Array.isArray(old.items)) return old;
        const nextItems = old.items.map((it) =>
          String(it.cartItemId ?? it.id) === String(variables.itemId)
            ? { ...it, ...data.cartItem, quantity: variables.quantity }
            : it
        );
        const t = sumLineTotals(nextItems);
        return { ...old, items: nextItems, subtotal: t, total: t };
      });
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
    onSuccess: (_void, itemId) => {
      queryClient.setQueryData(cartKeys.cart(), (old) => {
        if (!old || !Array.isArray(old.items)) return { items: [], subtotal: 0, total: 0 };
        const nextItems = old.items.filter((it) => String(it.cartItemId ?? it.id) !== String(itemId));
        const t = sumLineTotals(nextItems);
        return { ...old, items: nextItems, subtotal: t, total: t };
      });
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
