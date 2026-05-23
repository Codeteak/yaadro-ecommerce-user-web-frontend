import ProductDetailClient from './ProductDetailClient';
import { generateProductMetadataForId } from '../../../utils/productMetadata';
import { generateProductDetailStaticParams } from '../../../utils/productStaticParams';

// Production static export: only pre-rendered `/products/[id]/` paths exist. Dev stays fully dynamic.
export const dynamicParams = process.env.NODE_ENV !== 'production';

export async function generateMetadata({ params }) {
  const id = params?.id != null ? String(params.id).trim() : '';
  return generateProductMetadataForId(id, { pathPrefix: '/products' });
}

export async function generateStaticParams() {
  return generateProductDetailStaticParams();
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
