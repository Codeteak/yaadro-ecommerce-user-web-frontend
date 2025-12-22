'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { getProductById, getProductsByCategory } from '../../../data/products';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useRecentlyViewed } from '../../../context/RecentlyViewedContext';
import { useProductComparison } from '../../../context/ProductComparisonContext';
import { getProductRating, getProductDiscount, getDiscountedPrice, isOnSale } from '../../../utils/productUtils';
import Container from '../../../components/Container';
import Link from 'next/link';
import Breadcrumbs from '../../../components/Breadcrumbs';
import ProductCarousel from '../../../components/ProductCarousel';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { addToComparison, isInComparison, removeFromComparison, comparisonList, maxCompare } = useProductComparison();
  const [quantity, setQuantity] = useState(1);

  const product = getProductById(params.id);
  const inWishlist = product ? isInWishlist(product.id) : false;
  const inComparison = product ? isInComparison(product.id) : false;
  
  // Track recently viewed
  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);
  
  const rating = product ? getProductRating(product) : 0;
  const discount = product ? getProductDiscount(product) : 0;
  const discountedPrice = product ? getDiscountedPrice(product) : 0;
  const onSale = product ? isOnSale(product) : false;
  const imageSrc = product?.image || '/images/dummy.png';
  const images = product?.images && product.images.length > 0 ? product.images : [imageSrc, imageSrc, imageSrc];

  // Price / discount
  const originalPrice = product?.originalPrice || null;

  // Get available sizes or use default weight/unit
  const availableSizes = product?.sizes || (product?.weight && product?.unit ? [{ weight: product.weight, unit: product.unit, price: product.price }] : []);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || null);
  
  // Calculate current price based on selected size
  const currentPrice = selectedSize ? selectedSize.price : (product?.price || 0);
  const displayWeight = selectedSize ? `${selectedSize.weight} ${selectedSize.unit}` : (product?.weight && product?.unit ? `${product.weight} ${product.unit}` : '');
  const discountValue = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : null;

  // Get related products from the same category, excluding current product
  const relatedProducts = product?.category
    ? getProductsByCategory(product.category).filter(p => p.id !== product.id).slice(0, 10)
    : [];

  if (!product) {
    return (
      <Container>
        <div className="py-16 text-center w-full max-w-full overflow-x-hidden">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
          <Link
            href="/products"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </Container>
    );
  }

  const handleAddToCart = () => {
    const productToAdd = {
      ...product,
      price: currentPrice,
      selectedSize: selectedSize,
      sizeDisplay: displayWeight,
    };
    addToCart(productToAdd, quantity);
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
  ];
  
  if (product.category) {
    breadcrumbItems.push({ label: product.category, href: `/products?category=${encodeURIComponent(product.category)}` });
  }
  
  breadcrumbItems.push({ label: product.name });

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={breadcrumbItems} />
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 mt-4">
          {/* Left: gallery */}
          <div className="flex gap-4">
            <div className="hidden sm:flex flex-col gap-3 w-16">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden bg-white"
                >
                  <Image
                    src={img}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ))}
            </div>
            <div className="flex-1">
              <div className="relative w-full aspect-[4/5] rounded-3xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                <Image
                  src={imageSrc}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 420px"
                  priority
                />
                <button
                  onClick={handleWishlistToggle}
                  className="absolute top-3 right-3 p-2 bg-white rounded-full shadow hover:bg-pink-50 transition"
                  aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <svg
                    className={`w-5 h-5 ${inWishlist ? 'text-pink-500 fill-current' : 'text-gray-400'}`}
                    fill={inWishlist ? 'currentColor' : 'none'}
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
              </div>
              <div className="flex justify-center gap-8 mt-4 text-sm text-gray-700">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs">3 Days</span>
                  </div>
                  <span>Exchange</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs">Fast</span>
                  </div>
                  <span>Delivery</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: details */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug">
                  {product.name}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <span>Net Qty: 1 pc (1 L)</span>
                  <span className="text-green-700 font-semibold flex items-center gap-1">
                    <svg className="w-4 h-4 fill-green-700" viewBox="0 0 24 24">
                      <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
                    </svg>
                    {rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-gray-900">₹{currentPrice.toFixed(0)}</span>
              {originalPrice && originalPrice > currentPrice && (
                <span className="text-base text-gray-500 line-through">₹{originalPrice.toFixed(0)}</span>
              )}
              {discountValue && discountValue > 0 && (
                <span className="text-green-700 font-semibold text-sm">₹{discountValue.toFixed(0)} OFF</span>
              )}
            </div>

            {/* Size Selector */}
            {availableSizes.length > 1 && (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableSizes.map((size, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium ${
                        selectedSize?.weight === size.weight && selectedSize?.unit === size.unit
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {size.weight} {size.unit} - ₹{size.price.toFixed(0)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availableSizes.length === 1 && displayWeight && (
              <p className="text-sm text-gray-600">Size: {displayWeight}</p>
            )}

            {/* Offers list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">Coupons & Offers</h3>
              <div className="space-y-2">
                {[
                  'Earn 15% Off Your First Flight',
                  'Assured Cashback From CRED',
                  'Get Upto ₹50 Cashback on using Amazon Pay Balance',
                  'Get 10% discount with City Union Bank Credit Cards',
                  'Assured ₹10 - ₹100 cashback on using Bajaj Pay UPI',
                ].map((offer, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-600">•</span>
                    <span>{offer}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`w-full py-3 rounded-full text-center text-base font-semibold transition ${
                  product.inStock
                    ? 'bg-pink-600 text-white hover:bg-pink-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 md:mt-16">
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Related Products</h2>
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm md:text-base"
              >
                View All
              </Link>
            </div>
            <ProductCarousel
              products={relatedProducts}
              showMoreLink={`/products?category=${encodeURIComponent(product.category)}`}
            />
          </div>
        )}
      </Container>
    </div>
  );
}

