import ProductDetailClient from './ProductDetailClient';
import { products as staticProducts } from '../../../data/products';

// In production we use `output: 'export'` (static export), so Next.js needs a fixed
// list of params to pre-render. In local dev, keep this route fully dynamic.
export const dynamicParams = process.env.NODE_ENV !== 'production';

function getApiBaseUrl() {
  const fallback = 'http://localhost:3001/api';
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NEXT_PUBLIC_API_URL ? `${String(process.env.NEXT_PUBLIC_API_URL).trim().replace(/\/+$/, '')}/api` : '') ||
    fallback;
  const trimmed = String(base).trim().replace(/\/+$/, '');
  return trimmed.toLowerCase().endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function unwrapPayload(json) {
  if (!json || typeof json !== 'object') return json;
  // supports { status, data } envelope
  if ('data' in json && json.data && typeof json.data === 'object') return json.data;
  return json;
}

export async function generateStaticParams() {
  if (process.env.NODE_ENV !== 'production') return [];

  // Static export must include every product a user can navigate to.
  // Prefer fetching IDs from the storefront API at build time; fall back to local seed data.
  const shopId = process.env.NEXT_PUBLIC_SHOP_ID ? String(process.env.NEXT_PUBLIC_SHOP_ID).trim() : '';

  const fetchedIds = [];
  try {
    const base = getApiBaseUrl();
    const headers = { Accept: 'application/json' };
    if (shopId) headers['x-shop-id'] = shopId;

    const limit = 50;
    for (let offset = 0; offset <= 5000; offset += limit) {
      const url = `${base}/storefront/products?limit=${limit}&offset=${offset}`;
      const res = await fetch(url, { headers, method: 'GET' });
      if (!res.ok) break;
      const json = unwrapPayload(await res.json());
      const list = json?.products || [];
      if (!Array.isArray(list) || list.length === 0) break;
      for (const p of list) {
        const id = String(p?.slug || p?.id || '').trim();
        if (id) fetchedIds.push(id);
      }
      if (list.length < limit) break;
    }
  } catch {
    // ignore and fall back to static seed below
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