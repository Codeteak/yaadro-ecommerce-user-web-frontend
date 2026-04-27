import ProductDetailClient from './ProductDetailClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: '__placeholder__' }];
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}