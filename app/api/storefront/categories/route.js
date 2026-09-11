import { listCategoriesFromDb } from '../../../../lib/storefrontDbCatalog';
import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../lib/storefrontTryDbThenUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/categories
 * Postgres first (global_categories); customer API fallback.
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

    return jsonOk({
      status: 'success',
      data: {
        categories: result.categories,
      },
    });
  });
}
