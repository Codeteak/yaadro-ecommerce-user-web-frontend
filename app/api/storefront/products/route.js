import { listProductsFromDb } from '../../../../lib/storefrontDbCatalog';
import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../lib/storefrontTryDbThenUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products
 * Postgres first (shop_products); customer API fallback.
 */
export async function GET(request) {
  return tryDbThenUpstream(request, '/api/storefront/products', async () => {
    const { searchParams } = new URL(request.url);
    const shopId = readStorefrontShopId(request);
    const limit = searchParams.get('limit') || searchParams.get('per_page') || '20';
    const offset = searchParams.get('offset');
    const page = Number(searchParams.get('page') || 1);
    const resolvedOffset =
      offset != null && offset !== ''
        ? Number(offset)
        : page > 1
          ? (page - 1) * Number(limit)
          : 0;

    const result = await listProductsFromDb({
      shopId: shopId || undefined,
      categoryId: searchParams.get('category_id') || undefined,
      search: searchParams.get('search') || searchParams.get('q') || undefined,
      availability: searchParams.get('availability') || undefined,
      limit: Number(limit),
      offset: resolvedOffset,
      sortBy: searchParams.get('sort_by') || undefined,
      sortOrder: searchParams.get('sort_order') || undefined,
    });

    return jsonOk({
      status: 'success',
      data: {
        products: result.products,
        nextCursor: result.nextCursor,
      },
    });
  });
}
