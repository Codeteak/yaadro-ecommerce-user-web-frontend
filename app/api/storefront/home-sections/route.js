import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../lib/storefrontTryDbThenUpstream';
import { listYaadroHomeSections } from '../../../../lib/storefrontYaadroCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/home-sections
 * Postgres first (shop_home_sections); customer API fallback.
 */
export async function GET(request) {
  return tryDbThenUpstream(request, '/api/storefront/home-sections', async () => {
    const shopId = readStorefrontShopId(request);
    const payload = await listYaadroHomeSections(shopId);
    return jsonOk(payload);
  });
}
