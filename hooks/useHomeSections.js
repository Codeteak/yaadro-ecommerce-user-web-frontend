import { useQuery } from '@tanstack/react-query';
import { getHomeSections } from '../utils/homeSectionsApi';

export const homeSectionKeys = {
  all: ['home-sections'],
  list: () => [...homeSectionKeys.all, 'list'],
};

/**
 * Storefront home shelves (admin sortOrder). Empty list on API miss.
 */
export function useHomeSections(options = {}) {
  const { enabled = true } = options;
  const query = useQuery({
    queryKey: homeSectionKeys.list(),
    queryFn: getHomeSections,
    enabled,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  });

  return {
    sections: query.data?.sections ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
