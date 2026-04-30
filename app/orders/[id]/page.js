import OrderDetailClient from './OrderDetailClient';

export async function generateStaticParams() {
  // Local dev: allow any /orders/:id without prebuilding.
  if (process.env.NODE_ENV !== 'production') return [];

  // Production uses `output: 'export'` (static export). We can't pre-render per-user order IDs
  // at build time, so we keep a placeholder to satisfy Next.js export requirements.
  return [{ id: '__placeholder__' }];
}

export const dynamicParams = process.env.NODE_ENV !== 'production';

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}