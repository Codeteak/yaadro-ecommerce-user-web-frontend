/**
 * TanStack Query hooks for Cart
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCart, addToCart as apiAddToCart, updateCartItem, removeFromCart as apiRemoveFromCart, clearCart as apiClearCart } from '../utils/cartApi';
import { couponKeys } from './useCoupons';

// Query keys
export const cartKeys = {
  all: ['cart'],
  /** @param {string|undefined} couponCode Optional coupon preview (GET /storefront/cart?couponCode=) */
  cart: (couponCode) => [
    ...cartKeys.all,
    couponCode ? String(couponCode).trim().toUpperCase() : '',
  ],
};

/** Normalized empty cart for query cache after checkout / clear. */
export const EMPTY_CART_QUERY = {
  items: [],
  subtotal: 0,
  total: 0,
  displayUnitsTotal: 0,
  subtotalMinor: 0,
};

function syncCartFromMutation(queryClient, cartData) {
  if (!cartData || !Array.isArray(cartData.items)) return;
  queryClient.setQueryData(cartKeys.cart(), cartData);
  // Refresh coupon-preview cart queries only — avoid racing GET /cart over mutation payload.
  queryClient.invalidateQueries({
    queryKey: cartKeys.all,
    predicate: (query) => {
      const code = query.queryKey?.[1];
      return typeof code === 'string' && code.length > 0;
    },
  });
  queryClient.invalidateQueries({ queryKey: couponKeys.all });
}

/**
 * Get current user's cart (optional coupon preview on read).
 */
export function useCartQuery(options = {}) {
  const { couponCode, ...queryOptions } = options;
  const normalizedCoupon = couponCode
    ? String(couponCode).trim().toUpperCase()
    : '';

  return useQuery({
    queryKey: cartKeys.cart(normalizedCoupon || undefined),
    queryFn: () => getCart({ couponCode: normalizedCoupon || undefined }),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    ...queryOptions,
  });
}

/**
 * Add item to cart mutation
 */
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity, delta, couponCode }) => {
      const amount = delta ?? quantity ?? 1;
      const options = couponCode ? { couponCode } : {};
      return apiAddToCart(productId, amount, options);
    },
    onSuccess: (cartData) => syncCartFromMutation(queryClient, cartData),
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
    mutationFn: ({ itemId, quantity, delta, couponCode }) => {
      const opts = { couponCode: couponCode || undefined };
      if (delta != null && Number.isFinite(Number(delta))) {
        opts.delta = Math.trunc(Number(delta));
        return updateCartItem(itemId, undefined, opts);
      }
      return updateCartItem(itemId, quantity, opts);
    },
    onSuccess: (cartData) => syncCartFromMutation(queryClient, cartData),
  });
}

/**
 * Remove item from cart mutation
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId, options) => {
      if (typeof itemId === 'object' && itemId != null) {
        return apiRemoveFromCart(itemId.itemId, { couponCode: itemId.couponCode });
      }
      return apiRemoveFromCart(itemId, options);
    },
    onSuccess: (cartData) => syncCartFromMutation(queryClient, cartData),
  });
}

/**
 * Clear cart mutation
 */
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClearCart(),
    onSuccess: (cartData) => {
      if (cartData && Array.isArray(cartData.items)) {
        syncCartFromMutation(queryClient, cartData);
      } else {
        queryClient.setQueryData(cartKeys.cart(), EMPTY_CART_QUERY);
      }
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}
