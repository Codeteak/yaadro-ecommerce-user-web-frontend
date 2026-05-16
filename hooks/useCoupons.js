import { useQuery } from '@tanstack/react-query';
import { listStorefrontCoupons } from '../utils/storefrontCouponsApi';

export const couponKeys = {
  all: ['coupons'],
  list: (cartSubtotalMinor, code) => [...couponKeys.all, 'list', cartSubtotalMinor ?? null, code ?? ''],
};

/**
 * Fetch available coupons for checkout (requires auth + shop).
 */
export function useStorefrontCoupons(cartSubtotalMinor, options = {}) {
  const { enabled = true, code, onlyApplicable = false, ...queryOptions } = options;

  return useQuery({
    queryKey: couponKeys.list(cartSubtotalMinor, code),
    queryFn: () =>
      listStorefrontCoupons({
        cartSubtotalMinor,
        code,
        onlyApplicable,
      }),
    enabled: enabled && cartSubtotalMinor != null,
    staleTime: 60 * 1000,
    ...queryOptions,
  });
}
