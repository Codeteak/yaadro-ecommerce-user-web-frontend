'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useProductWithRelated } from '../../../hooks/useProducts';
import { useCart } from '../../../context/CartContext';
import { useWishlist } from '../../../context/WishlistContext';
import { useRecentlyViewed } from '../../../context/RecentlyViewedContext';
import { useProductComparison } from '../../../context/ProductComparisonContext';
import { useAlert } from '../../../context/AlertContext';
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
  const { showAlert } = useAlert();
  const [quantity, setQuantity] = useState(1);

  // Load product details using TanStack Query
  const { data: productData, isLoading: loading } = useProductWithRelated(params.id);
  const product = productData?.product || null;
  const relatedProducts = productData?.relatedProducts || [];

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
  const images = product?.images && product.images.length > 0 
    ? product.images 
    : [imageSrc];
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Price / discount
  const originalPrice = product?.originalPrice || null;

  // Get available sizes or use default weight/unit
  const availableSizes = product?.sizes || (product?.weight && product?.unit 
    ? [{ weight: product.weight, unit: product.unit, price: parseFloat(product.price) }] 
    : []);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || null);
  
  // Calculate current price based on selected size
  const currentPrice = selectedSize ? selectedSize.price : (product ? parseFloat(product.price) : 0);
  const displayWeight = selectedSize 
    ? `${selectedSize.weight} ${selectedSize.unit}` 
    : (product?.weight && product?.unit ? `${product.weight} ${product.unit}` : '');

  if (loading) {
    return (
      <Container>
        <div className="py-16 text-center w-full max-w-full overflow-x-hidden">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Loading product...</p>
        </div>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container>
        <div className="py-16 text-center w-full max-w-full overflow-x-hidden">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
          <Link
            href="/products"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
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

  const handleComparisonToggle = () => {
    if (!product) return;
    if (inComparison) {
      removeFromComparison(product.id);
      return;
    }
    if (comparisonList.length >= maxCompare) {
      showAlert(`You can compare up to ${maxCompare} products. Please remove one first.`, 'Limit Reached', 'warning');
      return;
    }
    addToComparison(product);
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  // Carousel navigation
  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  // Swipe gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && images.length > 1) {
      goToNext();
    }
    if (isRightSwipe && images.length > 1) {
      goToPrevious();
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

  const effectivePrice = product?.offerPriceEffective ?? product?.offerPrice ?? currentPrice;
  const discountValue = originalPrice != null && originalPrice > effectivePrice ? originalPrice - effectivePrice : null;
  const shortDescription = product?.shortName || (product?.description ? product.description.slice(0, 120) + (product.description.length > 120 ? '...' : '') : '');
  const deliveryTimeEstimate = product?.deliveryTimeEstimate ?? '5–7 business days';
  const nutritionalInformation = product?.nutritionalInformation ?? null;
  const allergenInformation = product?.allergenInformation ?? null;
  const storageInstructions = product?.storageInstructions || (product?.storageType ? `Store in ${String(product.storageType).replace('_', ' ')}.` : null);
  const frequentlyBoughtTogether = product?.frequentlyBoughtTogether ?? relatedProducts.slice(0, 4);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = product?.name || 'Product';
    const text = product?.shortName || product?.name || '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url });
        showAlert('Link shared successfully.', 'Shared', 'success');
      } else {
        await navigator.clipboard?.writeText(url);
        showAlert('Link copied to clipboard.', 'Copied', 'success');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showAlert('Could not share.', 'Error', 'error');
    }
  };

  const formatDate = (d) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="py-4 md:py-6 lg:py-8 w-full max-w-full overflow-x-hidden">
      <Container>
        <Breadcrumbs items={breadcrumbItems} />
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 mt-4">
          {/* Left: gallery */}
          <div className="flex gap-4">
            {/* Thumbnail sidebar */}
            {images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-3 w-16">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToImage(idx)}
                    className={`relative w-16 h-16 rounded-xl border-2 overflow-hidden bg-white transition-all ${
                      idx === currentImageIndex
                        ? 'border-primary shadow-md scale-105'
                        : 'border-gray-200 hover:border-primary/60'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
            
            {/* Main image carousel */}
            <div className="flex-1 relative">
              <div 
                className="relative w-full aspect-[4/5] rounded-3xl border border-gray-100 shadow-sm bg-white overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Image container with transition */}
                <div 
                  className="flex transition-transform duration-500 ease-in-out h-full"
                  style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                >
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-full h-full flex-shrink-0">
                      <Image
                        src={img}
                        alt={`${product.name} - Image ${idx + 1}`}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 768px) 100vw, 420px"
                        priority={idx === 0}
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation buttons - only show if multiple images */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all z-10"
                      aria-label="Previous image"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all z-10"
                      aria-label="Next image"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Dot indicators */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => goToImage(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? 'bg-primary w-6'
                            : 'bg-white/60 hover:bg-white/80'
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  <button
                    onClick={handleComparisonToggle}
                    className={`p-2 bg-white/90 backdrop-blur-sm rounded-full shadow transition ${
                      inComparison ? 'text-blue-600 hover:bg-white' : 'text-gray-500 hover:bg-white'
                    }`}
                    aria-label={inComparison ? 'Remove from comparison' : 'Add to comparison'}
                    title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  </button>

                  <button
                    onClick={handleWishlistToggle}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow hover:bg-white transition"
                    aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <svg
                      className={`w-5 h-5 ${inWishlist ? 'text-primary fill-current' : 'text-gray-400'}`}
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
                  {product.weight && product.unit && (
                    <span>Net Qty: {product.weight} {product.unit}</span>
                  )}
                  {rating > 0 && (
                    <span className="text-green-700 font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4 fill-green-700" viewBox="0 0 24 24">
                        <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
                      </svg>
                      {rating.toFixed(1)}
                      {product.ratingsCount != null && product.ratingsCount > 0 && (
                        <span className="text-xs text-gray-500 ml-1">({product.ratingsCount} reviews)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">₹{effectivePrice.toFixed(0)}</span>
                {originalPrice != null && originalPrice > effectivePrice && (
                  <span className="text-base text-gray-500 line-through">₹{originalPrice.toFixed(0)} (MRP)</span>
                )}
                {discountValue && discountValue > 0 && (
                  <span className="text-green-700 font-semibold text-sm">₹{discountValue.toFixed(0)} OFF</span>
                )}
                {discount > 0 && (
                  <span className="text-green-700 font-semibold text-sm">{discount}% OFF</span>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`shrink-0 px-5 py-2 rounded-full text-center text-sm font-semibold transition ${
                  product.inStock
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add to Cart
              </button>
            </div>

            {/* Share Product button - next to wishlist in gallery; also add here for visibility */}
            <button onClick={handleShare} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share Product
            </button>

            {/* Variant options (size / weight / flavor) */}
            {availableSizes.length > 1 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Size / Variant</h3>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                        selectedSize?.weight === size.weight && selectedSize?.unit === size.unit
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary/60'
                      }`}
                    >
                      {size.weight} {size.unit} — ₹{size.price?.toFixed?.(0) ?? size.price}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(displayWeight || product.weight != null || product.unit) && (
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-700">Net weight / Quantity:</span>{' '}
                {displayWeight || (product.weight != null && product.unit ? `${product.weight} ${product.unit}` : product.unit || '—')}
                {product.packSize && <span className="ml-2">(Pack: {product.packSize})</span>}
                {product.unit && !displayWeight && !product.weight && <span>Unit: {product.unit}</span>}
              </div>
            )}

            {/* Category & Brand */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              {product.category && (
                <span>Category: <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="font-medium text-primary hover:underline">{product.category}</Link></span>
              )}
              {product.brand && (
                <span>Brand: <span className="font-semibold text-gray-800">{product.brand}</span></span>
              )}
            </div>

            {/* Short Description */}
            {shortDescription && <p className="text-sm text-gray-600">{shortDescription}</p>}

            {/* Veg / Non-veg & Organic tags */}
            <div className="flex flex-wrap gap-2">
              {product.vegNonVeg && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${product.vegNonVeg === 'veg' ? 'bg-green-100 text-green-800' : product.vegNonVeg === 'non_veg' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {product.vegNonVeg === 'veg' && '🟢 Veg'}
                  {product.vegNonVeg === 'non_veg' && '🔴 Non-veg'}
                  {(product.vegNonVeg === 'egg' || (product.vegNonVeg !== 'veg' && product.vegNonVeg !== 'non_veg')) && '🟡 Egg'}
                </span>
              )}
              {product.organicTag && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Organic</span>}
            </div>

            {/* Full Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Full Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Ingredients</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{product.ingredients}</p>
              </div>
            )}

            {/* Nutritional Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Nutritional Information</h3>
              {nutritionalInformation ? (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{typeof nutritionalInformation === 'string' ? nutritionalInformation : JSON.stringify(nutritionalInformation)}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Per 100g: Energy 250 kcal, Protein 8g, Carbs 45g, Fat 5g. (Sample data — update via API.)</p>
              )}
            </div>

            {/* Allergen Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Allergen Information</h3>
              {allergenInformation ? (
                <p className="text-sm text-gray-600">{allergenInformation}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Contains: Gluten, Milk. (Sample data — update via API.)</p>
              )}
            </div>

            {/* Expiry / Best Before */}
            {(product.expiryDate || product.shelfLife) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Expiry / Best Before</h3>
                <p className="text-sm text-gray-600">
                  {product.expiryDate && formatDate(product.expiryDate)}
                  {product.expiryDate && product.shelfLife && ' · '}
                  {product.shelfLife && `Shelf life: ${product.shelfLife}`}
                </p>
              </div>
            )}

            {/* Storage Instructions */}
            {storageInstructions && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Storage Instructions</h3>
                <p className="text-sm text-gray-600">{storageInstructions}</p>
              </div>
            )}

            {/* Country of Origin */}
            {product.countryOfOrigin && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Country of Origin</h3>
                <p className="text-sm text-gray-600">{product.countryOfOrigin}</p>
              </div>
            )}

            {/* Delivery Time Estimate */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Delivery</h3>
              <p className="text-sm text-gray-600">Estimated delivery: {deliveryTimeEstimate}</p>
            </div>

            {/* Return Policy */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Return Policy</h3>
              <p className="text-sm text-gray-600">
                {product.returnable !== false ? 'This item is returnable within the applicable return window.' : 'This item is non-returnable.'}
                {product.warranty && ` Warranty: ${product.warranty}.`}
              </p>
            </div>

            {/* Stock status */}
            <div>
              {product.inStock ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  In Stock {product.stock > 0 && `(${product.stock} available)`}
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  Out of Stock
                </span>
              )}
            </div>

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

            {/* CTA removed (button is next to price) */}
          </div>
        </div>

        {/* Frequently Bought Together */}
        {frequentlyBoughtTogether.length > 0 && (
          <div className="mt-12 md:mt-16">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 px-4 md:px-0">Frequently Bought Together</h2>
            <ProductCarousel
              products={frequentlyBoughtTogether}
              showMoreLink={product.category ? `/products?category=${encodeURIComponent(product.category)}` : '/products'}
            />
          </div>
        )}

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 md:mt-16">
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Related Products</h2>
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
                className="text-primary-dark hover:text-primary-dark font-semibold text-sm md:text-base"
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
