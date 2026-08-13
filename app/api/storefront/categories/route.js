import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '../../../../lib/db';
import { listCategoriesFromDb } from '../../../../lib/storefrontDbCatalog';
import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/storefront/categories
 * Read-only categories from DATABASE_URL when set.
 */
export async function GET(request) {
  if (!isDatabaseConfigured()) {
    return proxyUpstreamGet(request, '/api/storefront/categories');
  }

  try {
    const { searchParams } = new URL(request.url);
    const shopId =
      request.headers.get('x-shop-id') ||
      process.env.NEXT_PUBLIC_SHOP_ID ||
      '';
    const parentId = searchParams.get('parent_id');

    const result = await listCategoriesFromDb({
      shopId: shopId || undefined,
      parentId: parentId == null || parentId === '' ? null : parentId,
    });

    return NextResponse.json({
      status: 'success',
      data: {
        categories: result.categories,
      },
    });
  } catch (err) {
    console.error('[api/storefront/categories]', err?.message || err);
    return NextResponse.json(
      {
        status: 'error',
        message: err?.message || 'Failed to load categories from database',
      },
      { status: 500 }
    );
  }
}
