import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../../lib/storefrontTryDbThenUpstream';
import { getYaadroCatalogRevision } from '../../../../../lib/storefrontYaadroCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/storefront/catalog/revision — shop_products MAX(updated_at), else API. */
export async function GET(request) {
  return tryDbThenUpstream(request, '/api/storefront/catalog/revision', async () => {
    const shopId = readStorefrontShopId(request);
    const payload = await getYaadroCatalogRevision(shopId);
    return jsonOk(payload);
  });
}
