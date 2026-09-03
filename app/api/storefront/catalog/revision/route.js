import { NextResponse } from 'next/server';
import { proxyUpstreamGet } from '../../../../../lib/proxyUpstreamApi';
import { shouldUseUpstreamStorefrontCatalog } from '../../../../../lib/storefrontCatalogRouteSource';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/storefront/catalog/revision — catalog generation for live-update polling. */
export async function GET(request) {
  if (shouldUseUpstreamStorefrontCatalog()) {
    return proxyUpstreamGet(request, '/api/storefront/catalog/revision');
  }

  return NextResponse.json(
    { status: 'error', message: 'Catalog revision requires upstream customer API' },
    { status: 503 }
  );
}
