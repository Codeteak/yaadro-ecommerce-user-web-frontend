import OrderDetailClient from './OrderDetailClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: '__placeholder__' }];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}