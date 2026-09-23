import { proxyUpstreamGet } from '../../../../../lib/proxyUpstreamApi';
import { jsonErr } from '../../../../../lib/storefrontTryDbThenUpstream';
import { resolveStorefrontProductUpstreamPath } from '../../../../../lib/storefrontProductDetail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products/:id
 * Always proxy to the customer API (same as product list).
 * Avoids the slow Next.js Postgres + full-shop promo enrichment path on PDP.
 */
export async function GET(request, { params }) {
  const id = params?.id;
  const upstreamPath = resolveStorefrontProductUpstreamPath(id);
  if (!upstreamPath) {
    return jsonErr('Missing product id', 400);
  }

  return proxyUpstreamGet(request, upstreamPath);
}
