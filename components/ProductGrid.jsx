import ProductCard from './ProductCard';

export default function ProductGrid({ products, cardVariant }) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No products found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-8 gap-1 sm:gap-3 lg:gap-4 w-full max-w-full overflow-x-hidden">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={cardVariant} />
      ))}
    </div>
  );
}

