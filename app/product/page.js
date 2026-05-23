import ProductDetailClient from '../products/[id]/ProductDetailClient';
import { generateProductMetadataForId } from '../../utils/productMetadata';

export async function generateMetadata({ searchParams }) {
  const id = String(searchParams?.id || searchParams?.pid || '').trim();
  return generateProductMetadataForId(id, { pathPrefix: '/products' });
}

export default function ProductPage({ searchParams }) {
  const id = String(searchParams?.id || searchParams?.pid || '').trim();

  if (!id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Missing product id.
      </div>
    );
  }

  return <ProductDetailClient productId={id} />;
}
