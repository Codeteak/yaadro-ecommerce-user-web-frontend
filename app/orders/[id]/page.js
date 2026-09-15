import OrderDetailClient from './OrderDetailClient';

/** Cloudflare Pages static export only — EC2/`next start` loads any order id at runtime. */
const useStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const dynamicParams = !useStaticExport;

export async function generateStaticParams() {
  if (!useStaticExport) return [];

  // Static export can't pre-render per-user order IDs; placeholder satisfies Next export.
  return [{ id: '__placeholder__' }];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}
