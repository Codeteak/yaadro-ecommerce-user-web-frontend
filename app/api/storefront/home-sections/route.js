import { NextResponse } from 'next/server';
import { proxyUpstreamGet } from '../../../../lib/proxyUpstreamApi';
import { isDatabaseConfigured } from '../../../../lib/db';
import { getProductFromDb } from '../../../../lib/storefrontDbCatalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCT_LIST_KEYS = [
  'products',
  'buyProducts',
  'buy_products',
  'getProducts',
  'get_products',
];

function collectProductIds(sections) {
  const ids = new Set();
  for (const section of sections || []) {
    for (const key of PRODUCT_LIST_KEYS) {
      const list = section?.[key];
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        const id = p?.id != null ? String(p.id).trim() : '';
        if (id) ids.add(id);
      }
    }
  }
  return [...ids];
}

/**
 * Overlay DB catalog pricing (and image) onto lean home-sections product stubs.
 * Upstream often only sends priceMinorPerUnit; DB has actual/final/discount.
 */
function mergeShelfProduct(shelfProduct, dbProduct) {
  if (!dbProduct || typeof dbProduct !== 'object') return shelfProduct;

  const list =
    dbProduct.actual_price_minor ??
    dbProduct.price_minor_per_unit ??
    shelfProduct.priceMinorPerUnit ??
    shelfProduct.price_minor_per_unit ??
    null;
  const final =
    dbProduct.final_price_minor ??
    dbProduct.offer_price_minor_per_unit ??
    list;
  const discount =
    dbProduct.total_discount_minor != null
      ? dbProduct.total_discount_minor
      : list != null && final != null
        ? Math.max(0, Number(list) - Number(final))
        : 0;

  const imageUrl =
    (typeof dbProduct.imageUrl === 'string' && dbProduct.imageUrl) ||
    (typeof dbProduct.thumbnail?.url === 'string' && dbProduct.thumbnail.url) ||
    shelfProduct.imageUrl ||
    shelfProduct.image_url ||
    null;

  return {
    ...shelfProduct,
    name: dbProduct.name || shelfProduct.name,
    slug: dbProduct.slug || shelfProduct.slug,
    imageUrl,
    priceMinorPerUnit: list ?? shelfProduct.priceMinorPerUnit,
    price_minor_per_unit: list ?? shelfProduct.price_minor_per_unit,
    actual_price_minor: list,
    actualPriceMinor: list,
    final_price_minor: final,
    finalPriceMinor: final,
    total_discount_minor: discount,
    totalDiscountMinor: discount,
    ...(list != null && final != null && Number(final) < Number(list)
      ? {
          offer_price_minor_per_unit: final,
          offerPriceMinorPerUnit: final,
        }
      : {}),
  };
}

function enrichSections(sections, byId) {
  return (sections || []).map((section) => {
    const next = { ...section };
    for (const key of PRODUCT_LIST_KEYS) {
      if (!Array.isArray(section[key])) continue;
      next[key] = section[key].map((p) => {
        const id = p?.id != null ? String(p.id).trim() : '';
        return mergeShelfProduct(p, id ? byId.get(id) : null);
      });
    }
    return next;
  });
}

/**
 * GET /api/storefront/home-sections
 * Proxy section layout from customer API, then enrich product prices from DATABASE_URL
 * when configured (admin/catalog list + offer live in DB, not in lean shelf stubs).
 */
export async function GET(request) {
  const upstreamRes = await proxyUpstreamGet(request, '/api/storefront/home-sections');

  if (!upstreamRes.ok || !isDatabaseConfigured()) {
    return upstreamRes;
  }

  let body;
  try {
    body = await upstreamRes.json();
  } catch {
    return upstreamRes;
  }

  try {
    const sections = body?.data?.sections ?? body?.sections ?? [];
    const ids = collectProductIds(sections);
    if (!ids.length) {
      return NextResponse.json(body);
    }

    const shopId =
      request.headers.get('x-shop-id') ||
      process.env.NEXT_PUBLIC_SHOP_ID ||
      '';

    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          let product = await getProductFromDb(id, shopId || undefined);
          // Retry without shop filter if shop-scoped row missing (schema variance).
          if (!product && shopId) {
            product = await getProductFromDb(id, undefined);
          }
          return [id, product];
        } catch (err) {
          console.warn('[api/storefront/home-sections] db enrich', id, err?.message || err);
          return [id, null];
        }
      })
    );

    const byId = new Map();
    for (const [id, product] of entries) {
      if (product) byId.set(id, product);
    }

    if (!byId.size) {
      return NextResponse.json(body);
    }

    const enriched = enrichSections(sections, byId);

    if (body?.data && Array.isArray(body.data.sections)) {
      return NextResponse.json({
        ...body,
        data: { ...body.data, sections: enriched },
      });
    }
    if (Array.isArray(body?.sections)) {
      return NextResponse.json({ ...body, sections: enriched });
    }
    return NextResponse.json({ data: { sections: enriched } });
  } catch (err) {
    console.error('[api/storefront/home-sections] enrich failed', err?.message || err);
    return NextResponse.json(body);
  }
}
