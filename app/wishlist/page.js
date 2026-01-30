'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import Container from '../../components/Container';
import Breadcrumbs from '../../components/Breadcrumbs';

export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (product) => {
    addToCart(product, 1);
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="py-16 w-full max-w-full overflow-x-hidden">
        <Container>
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Wishlist', href: '/wishlist' }]} />
          <div className="text-center mt-4">
            <div className="mb-8">
              <svg
                className="w-24 h-24 mx-auto text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Your Wishlist is Empty</h1>
            <p className="text-gray-600 mb-8">
              Start adding products to your wishlist to save them for later.
            </p>
            <Link
              href="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Wishlist', href: '/wishlist' }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8 px-4 md:px-0 mt-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
            My Wishlist ({wishlistItems.length})
          </h1>
          {wishlistItems.length > 0 && (
            <button
              onClick={clearWishlist}
              className="text-sm md:text-base text-red-600 hover:text-red-800 font-medium transition-colors self-start sm:self-auto"
            >
              Clear Wishlist
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
          {wishlistItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group relative"
            >
              <Link href={`/products/${item.id}`}>
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              </Link>
              
              {/* Remove from Wishlist Button */}
              <button
                onClick={() => removeFromWishlist(item.id)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-primary/10 transition-colors z-10"
                aria-label="Remove from wishlist"
              >
                <svg
                  className="w-5 h-5 text-primary fill-current"
                  fill="currentColor"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>

              <div className="p-4 min-w-0">
                <Link href={`/products/${item.id}`}>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 hover:text-gray-600 transition-colors line-clamp-2 break-words">
                    {item.name}
                  </h3>
                </Link>
                <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-1 break-words">
                  {item.description}
                </p>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className="text-lg sm:text-xl font-bold text-gray-900 truncate min-w-0">
                    ₹{item.price.toFixed(0)}
                  </span>
                  {!item.inStock && (
                    <span className="text-xs text-red-600 font-semibold whitespace-nowrap flex-shrink-0">Out of Stock</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/products/${item.id}`}
                    className="flex-1 text-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.inStock}
                    className={`flex-1 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                      item.inStock
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

