import ProductDetailClient from './ProductDetailClient';
import { products as staticProducts } from '../../../data/products';

// In production we use `output: 'export'` (static export), so Next.js needs a fixed
// list of params to pre-render. In local dev, keep this route fully dynamic.
export const dynamicParams = process.env.NODE_ENV !== 'production';

export async function generateStaticParams() {
  if (process.env.NODE_ENV !== 'production') return [];

  // Static export source of truth (local catalog seed)
  return (staticProducts || [])
    .map((p) => ({
      id: String(p?.slug || p?.id || '').trim(),
    }))
    .filter((p) => p.id);
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}