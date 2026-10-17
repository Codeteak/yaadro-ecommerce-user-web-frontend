import { useQuery } from '@tanstack/react-query';
import { getHomeSections } from '../utils/homeSectionsApi';
import { useStorefrontShopGate } from './useStorefrontShopGate';

export const homeSectionKeys = {
  all: ['home-sections'],
  list: (shopId = '') => [...homeSectionKeys.all, 'list', shopId || ''],
};

/**
 * Storefront home shelves (admin sortOrder). Empty list on API miss.
 */
export function useHomeSections(options = {}) {
  const { enabled = true, staleTime = 60 * 1000 } = options;
  const { ready, shopId } = useStorefrontShopGate();
  const query = useQuery({
    queryKey: homeSectionKeys.list(shopId),
    queryFn: getHomeSections,
    enabled: enabled && ready,
    staleTime,
    refetchOnMount: 'always',
    retry: 1,
  });

  return {
    sections: query.data?.sections ?? [],
    isLoading: query.isLoading || (!ready && enabled),
    error: query.error,
    refetch: query.refetch,
  };
}
