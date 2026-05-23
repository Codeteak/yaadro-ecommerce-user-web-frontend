import ProductDetailClient from '../products/[id]/ProductDetailClient';
import { generateProductMetadataForId } from '../../utils/productMetadata';
import { normalizeProductRouteParam } from '../../utils/productApi';

export async function generateMetadata({ searchParams }) {
  const id = normalizeProductRouteParam(searchParams?.id || searchParams?.pid);
  return generateProductMetadataForId(id, { pathPrefix: '/products' });
}

export default function ProductPage({ searchParams }) {
  const id = normalizeProductRouteParam(searchParams?.id || searchParams?.pid);

  if (!id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Missing product id.
      </div>
    );
  }

  return <ProductDetailClient productId={id} />;
}
