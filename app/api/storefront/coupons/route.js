import {
  jsonOk,
  readStorefrontShopId,
  tryDbThenUpstream,
} from '../../../../lib/storefrontTryDbThenUpstream';
import { listYaadroCoupons } from '../../../../lib/storefrontYaadroCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/coupons
 * Public coupon catalog from Postgres (no login). Customer eligibility
 * (first-order / new-customer redemptions) still needs customer API at checkout.
 */
export async function GET(request) {
  return tryDbThenUpstream(request, '/api/storefront/coupons', async () => {
    const { searchParams } = new URL(request.url);
    const shopId = readStorefrontShopId(request);
    const cartRaw = searchParams.get('cartSubtotalMinor');
    const payload = await listYaadroCoupons({
      shopId,
      code: searchParams.get('code') || undefined,
      cartSubtotalMinor: cartRaw != null && cartRaw !== '' ? Number(cartRaw) : undefined,
      onlyApplicable:
        searchParams.get('onlyApplicable') === 'true' ||
        searchParams.get('onlyApplicable') === '1',
    });
    return jsonOk(payload);
  });
}
