import { getProductFromDb } from '../../../../../lib/storefrontDbCatalog';
import {
  jsonErr,
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../../lib/storefrontTryDbThenUpstream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products/:id
 * Postgres first; customer API fallback.
 */
export async function GET(request, { params }) {
  const id = params?.id;
  if (!id) {
    return jsonErr('Missing product id', 400);
  }

  return tryDbThenUpstream(
    request,
    `/api/storefront/products/${encodeURIComponent(id)}`,
    async () => {
      const shopId = readStorefrontShopId(request);
      const product = await getProductFromDb(String(id), shopId || undefined);
      if (!product) {
        return jsonErr('Product not found', 404);
      }
      return jsonOk({
        status: 'success',
        data: { product },
      });
    }
  );
}
