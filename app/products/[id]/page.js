import ProductDetailClient from './ProductDetailClient';
import ProductDetailErrorBoundary from '../../../components/ProductDetailErrorBoundary';
import { generateProductMetadataForId } from '../../../utils/productMetadata';
import { generateProductDetailStaticParams } from '../../../utils/productStaticParams';

/** Cloudflare Pages static export only — EC2/`next start` loads any product id at runtime. */
const useStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

export const dynamicParams = !useStaticExport;

export async function generateMetadata({ params }) {
  const id = params?.id != null ? String(params.id).trim() : '';
  return generateProductMetadataForId(id, { pathPrefix: '/products' });
}

export async function generateStaticParams() {
  if (!useStaticExport) return [];
  return generateProductDetailStaticParams();
}

export default function ProductDetailPage() {
  return (
    <ProductDetailErrorBoundary>
      <ProductDetailClient />
    </ProductDetailErrorBoundary>
  );
}
