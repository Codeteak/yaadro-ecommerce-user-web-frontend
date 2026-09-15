import { listCategoriesFromDb } from '../../../../lib/storefrontDbCatalog';
import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';
import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../lib/storefrontTryDbThenUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/categories
 * Postgres first for the resolved shop; customer API fallback on error or empty.
 */
export async function GET(request) {
  return tryDbThenUpstream(request, '/api/storefront/categories', async () => {
    const { searchParams } = new URL(request.url);
    const shopId = readStorefrontShopId(request);
    const parentId = searchParams.get('parent_id');
    const all =
      searchParams.get('all') === 'true' || searchParams.get('all') === '1';

    const result = await listCategoriesFromDb({
      shopId: shopId || undefined,
      parentId: parentId == null || parentId === '' ? null : parentId,
      all,
    });

    const categories = Array.isArray(result?.categories) ? result.categories : [];

    // Empty success used to skip upstream and blank the categories page in prod.
    if (categories.length === 0 && shopId) {
      console.warn(
        '[storefront/categories] DB returned 0 categories for shop; falling back to customer API'
      );
      return proxyUpstreamGet(request, '/api/storefront/categories');
    }

    return jsonOk({
      status: 'success',
      data: {
        categories,
      },
    });
  });
}
