import OrderDetailClient from './OrderDetailClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}