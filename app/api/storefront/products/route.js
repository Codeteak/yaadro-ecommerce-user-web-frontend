import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products
 * Always proxy to the customer API (Redis SWR cache). Avoids Next Postgres
 * then-empty → second upstream hop on the hot list path.
 */
export async function GET(request) {
  return proxyUpstreamGet(request, '/api/storefront/products');
}
