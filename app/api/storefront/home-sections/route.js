import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/home-sections
 * Always proxy to customer API (no local DB table). Avoids Next rewrite
 * forwarding the browser User-Agent, which ngrok free blocks (ERR_NGROK_6024).
 */
export async function GET(request) {
  return proxyUpstreamGet(request, '/api/storefront/home-sections');
}
