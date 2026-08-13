import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '../../../../lib/db';
import { listProductsFromDb } from '../../../../lib/storefrontDbCatalog';
import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/products
 * - With DATABASE_URL: read-only SQL against Supabase/Postgres
 * - Without: proxy to configured upstream API
 */
export async function GET(request) {
  if (!isDatabaseConfigured()) {
    return proxyUpstreamGet(request, '/api/storefront/products');
  }

  try {
    const { searchParams } = new URL(request.url);
    const shopId =
      request.headers.get('x-shop-id') ||
      process.env.NEXT_PUBLIC_SHOP_ID ||
      '';

    const limit = searchParams.get('limit') || searchParams.get('per_page') || '20';
    const offset = searchParams.get('offset');
    const page = Number(searchParams.get('page') || 1);
    const resolvedOffset =
      offset != null && offset !== ''
        ? Number(offset)
        : page > 1
          ? (page - 1) * Number(limit)
          : 0;

    const result = await listProductsFromDb({
      shopId: shopId || undefined,
      categoryId: searchParams.get('category_id') || undefined,
      search: searchParams.get('search') || searchParams.get('q') || undefined,
      availability: searchParams.get('availability') || undefined,
      limit: Number(limit),
      offset: resolvedOffset,
      sortBy: searchParams.get('sort_by') || undefined,
      sortOrder: searchParams.get('sort_order') || undefined,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        products: result.products,
        nextCursor: result.nextCursor,
      },
    });
  } catch (err) {
    console.error('[api/storefront/products]', err?.message || err);
    return NextResponse.json(
      {
        status: 'error',
        message: err?.message || 'Failed to load products from database',
      },
      { status: 500 }
    );
  }
}
