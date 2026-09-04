import { NextResponse } from 'next/server';
import { getProductFromDb } from '../../../../../lib/storefrontDbCatalog';
import { proxyUpstreamGet } from '../../../../../lib/proxyUpstreamApi';
import { shouldUseUpstreamStorefrontCatalog } from '../../../../../lib/storefrontCatalogRouteSource';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products/:id
 * Read-only product detail from DATABASE_URL when set.
 */
export async function GET(request, { params }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { status: 'error', message: 'Missing product id' },
      { status: 400 }
    );
  }

  if (shouldUseUpstreamStorefrontCatalog()) {
    return proxyUpstreamGet(
      request,
      `/api/storefront/products/${encodeURIComponent(id)}`
    );
  }

  try {
    const shopId =
      request.headers.get('x-shop-id') ||
      process.env.NEXT_PUBLIC_SHOP_ID ||
      '';

    const product = await getProductFromDb(String(id), shopId || undefined);
    if (!product) {
      return NextResponse.json(
        { status: 'error', message: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: { product },
    });
  } catch (err) {
    console.error('[api/storefront/products/:id]', err?.message || err);
    return NextResponse.json(
      {
        status: 'error',
        message: err?.message || 'Failed to load product from database',
      },
      { status: 500 }
    );
  }
}
