import ProductDetailClient from './ProductDetailClient';
import { generateProductMetadataForId } from '../../../utils/productMetadata';
import { products as staticProducts } from '../../../data/products';
import {
  fetchAtBuildTime,
  getBuildApiBaseUrl,
  unwrapApiPayload,
  warnBuildApiUnavailable,
} from '../../../utils/buildTimeApi';
import { extractStorefrontProductsPayload } from '../../../utils/productApi';

// In production we use `output: 'export'` (static export), so Next.js needs a fixed
// list of params to pre-render. In local dev, keep this route fully dynamic.
export const dynamicParams = process.env.NODE_ENV !== 'production';

export async function generateMetadata({ params }) {
  const id = params?.id != null ? String(params.id).trim() : '';
  return generateProductMetadataForId(id, { pathPrefix: '/products' });
}

export async function generateStaticParams() {
  if (process.env.NODE_ENV !== 'production') return [];

  // Static export must include every product a user can navigate to.
  // Prefer fetching IDs from the storefront API at build time; fall back to local seed data.
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim() : '';

  const fetchedIds = [];
  try {
    const base = getBuildApiBaseUrl();
    const headers = { Accept: 'application/json' };
    if (shopId) headers['x-shop-id'] = shopId;

    const limit = 50;
    for (let offset = 0; offset <= 5000; offset += limit) {
      const url = `${base}/storefront/products?limit=${limit}&offset=${offset}`;
      const json = unwrapApiPayload(await fetchAtBuildTime(url, { headers }));
      const { rawProducts: list } = extractStorefrontProductsPayload(json);
      if (!Array.isArray(list) || list.length === 0) break;
      for (const p of list) {
        const id = String(p?.slug || p?.id || '').trim();
        if (id) fetchedIds.push(id);
      }
      if (list.length < limit) break;
    }
  } catch (err) {
    warnBuildApiUnavailable('Product list', err);
  }

  const seedIds = (staticProducts || [])
    .map((p) => String(p?.slug || p?.id || '').trim())
    .filter(Boolean);

  const all = Array.from(new Set([...fetchedIds, ...seedIds]));
  return all.map((id) => ({ id }));
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}