/**
 * TanStack Query hooks for cart coupon preview (localStorage cart + POST /cart/preview).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { previewCart } from '../utils/cartApi';
import { stripPaidCartLinesOnly } from '../utils/cartPromotions';

// Query keys
export const cartKeys = {
  all: ['cart'],
  /**
   * @param {string|undefined} couponCode
   * @param {string} [itemsKey] Stable fingerprint of local paid lines
   */
  preview: (couponCode, itemsKey = '') => [
    ...cartKeys.all,
    'preview',
    couponCode ? String(couponCode).trim().toUpperCase() : '',
    itemsKey,
  ],
  /** @deprecated Prefer cartKeys.preview — kept for invalidateQueries callers */
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

function fingerprintPaidItems(items) {
  return toPreviewPayload(items)
    .map((it) => `${it.productId}:${it.quantity}`)
    .sort()
    .join('|');
}

function toPreviewPayload(items) {
  return stripPaidCartLinesOnly(items)
    .map((it) => ({
      productId: String(
        it?.productId ?? it?.product_id ?? it?.product?.id ?? ''
      ).trim(),
      quantity: Number(it?.quantity) || 0,
    }))
    .filter((it) => it.productId && it.quantity > 0);
}

/**
 * Preview pricing/coupon for local cart lines (no Redis cart).
 */
export function useCartQuery(options = {}) {
  const { couponCode, items = [], ...queryOptions } = options;
  const normalizedCoupon = couponCode
    ? String(couponCode).trim().toUpperCase()
    : '';
  const payload = toPreviewPayload(items);
  const itemsKey = fingerprintPaidItems(items);

  return useQuery({
    queryKey: cartKeys.preview(normalizedCoupon || undefined, itemsKey),
    queryFn: () =>
      previewCart({
        items: payload,
        couponCode: normalizedCoupon || undefined,
      }),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    ...queryOptions,
  });
}

/** Clear all cart preview query caches (e.g. after local clear / checkout). */
export function useInvalidateCartQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(cartKeys.cart(), EMPTY_CART_QUERY);
    queryClient.invalidateQueries({ queryKey: cartKeys.all });
  };
}
