import { useQuery } from '@tanstack/react-query';
import { listStorefrontCoupons } from '../utils/storefrontCouponsApi';
import { useStorefrontShopGate } from './useStorefrontShopGate';

export const couponKeys = {
  all: ['coupons'],
  list: (shopId, cartSubtotalMinor, code) => [
    ...couponKeys.all,
    'list',
    shopId || '',
    cartSubtotalMinor ?? null,
    code ?? '',
  ],
};

/**
 * Fetch available coupons for checkout (shop-scoped; login not required for the list).
 */
export function useStorefrontCoupons(cartSubtotalMinor, options = {}) {
  const { enabled = true, code, onlyApplicable = false, ...queryOptions } = options;
  const { ready, shopId } = useStorefrontShopGate();

  return useQuery({
    queryKey: couponKeys.list(shopId, cartSubtotalMinor, code),
    queryFn: () =>
      listStorefrontCoupons({
        cartSubtotalMinor,
        code,
        onlyApplicable,
      }),
    enabled: enabled && ready && cartSubtotalMinor != null,
    staleTime: 60 * 1000,
    ...queryOptions,
  });
}
