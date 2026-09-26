import { listProductsFromDb } from '../../../../lib/storefrontDbCatalog';
import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';
import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../lib/storefrontTryDbThenUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products
 * Postgres first (includes brand from global_brands); customer API fallback.
 */
export async function GET(request) {
  return tryDbThenUpstream(request, '/api/storefront/products', async () => {
    const { searchParams } = new URL(request.url);
    const shopId = readStorefrontShopId(request);

    const limitRaw = searchParams.get('limit') ?? searchParams.get('per_page');
    const offsetRaw = searchParams.get('offset');
    const categoryId = searchParams.get('category_id') || searchParams.get('categoryId');
    const brandId = searchParams.get('brand_id') || searchParams.get('brandId');
    const includeDescendants =
      searchParams.get('include_descendants') === '1' ||
      searchParams.get('include_descendants') === 'true';
    const search = searchParams.get('search') || searchParams.get('q') || '';
    const availability = searchParams.get('availability') || '';
    const sortBy = searchParams.get('sort_by') || searchParams.get('sortBy') || '';
    const sortOrder = searchParams.get('sort_order') || searchParams.get('sortOrder') || '';

    const result = await listProductsFromDb({
      shopId: shopId || undefined,
      limit: limitRaw != null ? Number(limitRaw) : undefined,
      offset: offsetRaw != null ? Number(offsetRaw) : undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      includeDescendants: Boolean(includeDescendants && categoryId),
      search: search || undefined,
      availability: availability || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    });

    const products = Array.isArray(result?.products) ? result.products : [];
    if (products.length === 0 && shopId) {
      console.warn(
        '[storefront/products] DB returned 0 products for shop; falling back to customer API'
      );
      return proxyUpstreamGet(request, '/api/storefront/products');
    }

    return jsonOk({
      status: 'success',
      data: {
        products,
        nextCursor: result?.nextCursor ?? null,
      },
    });
  });
}
