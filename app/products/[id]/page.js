import ProductDetailClient from './ProductDetailClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [];
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}