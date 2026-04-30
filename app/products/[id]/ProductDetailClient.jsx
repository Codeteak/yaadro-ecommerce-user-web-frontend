'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useProductWithRelated } from '../../../hooks/useProducts';
import { useCart } from '../../../context/CartContext';
import { useRecentlyViewed } from '../../../context/RecentlyViewedContext';
import { useAlert } from '../../../context/AlertContext';
import {
  getProductRating,
  getProductDiscount,
  getEffectivePrice,
  formatRupeeINR,
} from '../../../utils/productUtils';
import Container from '../../../components/Container';
import ProductDetailSkeleton from '../../../components/ProductDetailSkeleton';
import Link from 'next/link';
import ProductCarousel from '../../../components/ProductCarousel';
import { SHOW_PRODUCT_EXTENDED_SECTIONS } from './productDetailFlags';

function PillTag({ children, color = 'green' }) {
  const colorMap = {
    green: 'bg-emerald-100 text-emerald-800',
    orange: 'bg-amber-100 text-amber-800',
    discountGreen: 'bg-green-600 text-white shadow-sm font-bold',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function Divider() {
  return <hr className="border-t border-gray-100 my-5" />;
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[11px] text-gray-400 mb-1">{label}</p>
      <p className="text-[13px] font-medium text-gray-800">{value}</p>
    </div>
  );
}

function OfferRow({ iconBg, iconColor, children }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}
      >
        <svg
          className={`w-3.5 h-3.5 ${iconColor}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z"
          />
        </svg>
      </div>
      <p className="text-[12px] text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function ReviewCard({ author, rating, text }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-[12px] font-medium text-gray-800 mb-1">{author}</p>
      <div className="flex mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${i < rating ? 'text-amber-400' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
          </svg>
        ))}
      </div>
      <p className="text-[12px] text-gray-500 leading-relaxed">{text}</p>
    </div>
  );
}

export default function ProductDetailClient({ productId = null }) {
  const params = useParams();
  const router = useRouter();
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { showAlert } = useAlert();

  const [cartActionLoading, setCartActionLoading] = useState(false);

  const resolvedId = productId != null ? String(productId) : params?.id;
  const { data: productData, isLoading: loading } = useProductWithRelated(resolvedId);
  const product = productData?.product || null;
  const relatedProducts = productData?.relatedProducts || [];

  useEffect(() => {
    if (product) addToRecentlyViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const rating = product ? getProductRating(product) : 0;
  const discount = product ? getProductDiscount(product) : 0;

  const imageSrc = product?.image || '/images/dummy.png';
  const images =
    product?.images && product.images.length > 0 ? product.images : [imageSrc];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const availableSizes =
    product?.sizes ||
    (product?.weight && product?.unit
      ? [{ weight: product.weight, unit: product.unit, price: parseFloat(product.price) }]
      : []);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || null);

  const listUnit = selectedSize
    ? parseFloat(selectedSize.price)
    : product
    ? parseFloat(product.price)
    : 0;
  const displayWeight = selectedSize
    ? `${selectedSize.weight} ${selectedSize.unit}`
    : product?.weight && product?.unit
    ? `${product.weight} ${product.unit}`
    : '';

  const legacyOriginal =
    product?.originalPrice != null ? parseFloat(product.originalPrice) : null;
  const effectivePrice = product ? getEffectivePrice(product, listUnit) : 0;
  const mrpDisplay =
    product && effectivePrice < listUnit - 1e-9
      ? listUnit
      : legacyOriginal != null && legacyOriginal > effectivePrice
        ? legacyOriginal
        : null;
  const discountValue =
    mrpDisplay != null && mrpDisplay > effectivePrice ? mrpDisplay - effectivePrice : null;
  const deliveryTimeEstimate = product?.deliveryTimeEstimate ?? '5–7 business days';
  const nutritionalInformation = product?.nutritionalInformation ?? null;
  const allergenInformation = product?.allergenInformation ?? null;
  const storageInstructions =
    product?.storageInstructions ||
    (product?.storageType
      ? `Store in ${String(product.storageType).replace('_', ' ')}.`
      : null);
  const frequentlyBoughtTogether = product?.frequentlyBoughtTogether ?? relatedProducts.slice(0, 4);

  const productToAddPayload = useMemo(
    () =>
      product
        ? {
            ...product,
            price: effectivePrice,
            ...(mrpDisplay != null ? { originalPrice: mrpDisplay } : {}),
            selectedSize,
            sizeDisplay: displayWeight,
          }
        : null,
    [product, effectivePrice, mrpDisplay, selectedSize, displayWeight]
  );

  const cartLine = useMemo(() => {
    if (!product) return null;
    const productId = product.id;
    const sizeKey = selectedSize
      ? `${selectedSize.weight}${selectedSize.unit}`
      : 'default';
    return cartItems.find((item) => {
      const pid = item.productId ?? item.product?.id ?? item.id;
      if (String(pid) !== String(productId)) return false;
      const itemSizeKey = item.selectedSize
        ? `${item.selectedSize.weight}${item.selectedSize.unit}`
        : 'default';
      return itemSizeKey === sizeKey;
    });
  }, [cartItems, product, selectedSize]);

  const cartQty = cartLine?.quantity ?? 0;
  const cartUpdateKey = cartLine
    ? cartLine.cartItemKey ?? cartLine.cartItemId ?? cartLine.id
    : null;

  const lineSubtotal = formatRupeeINR(effectivePrice * (cartQty || 0));

  const handleAddToCart = useCallback(async () => {
    if (!productToAddPayload || !product?.inStock) return;
    setCartActionLoading(true);
    try {
      await addToCart(productToAddPayload, 1);
    } finally {
      setCartActionLoading(false);
    }
  }, [addToCart, productToAddPayload, product?.inStock]);

  const handleStepperIncrement = useCallback(async () => {
    if (cartActionLoading || !productToAddPayload || cartUpdateKey == null) return;
    if (cartQty >= 10) return;
    setCartActionLoading(true);
    try {
      await updateQuantity(cartUpdateKey, cartQty + 1);
    } finally {
      setCartActionLoading(false);
    }
  }, [cartActionLoading, productToAddPayload, cartUpdateKey, cartQty, updateQuantity]);

  const handleStepperDecrement = useCallback(async () => {
    if (cartActionLoading || cartUpdateKey == null || cartQty <= 0) return;
    setCartActionLoading(true);
    try {
      if (cartQty <= 1) {
        await removeFromCart(cartUpdateKey);
      } else {
        await updateQuantity(cartUpdateKey, cartQty - 1);
      }
    } finally {
      setCartActionLoading(false);
    }
  }, [cartActionLoading, cartUpdateKey, cartQty, removeFromCart, updateQuantity]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showAlert('Link copied to clipboard.', 'Copied', 'success');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') showAlert('Could not share.', 'Error', 'error');
    }
  };

  const goToPrevious = () =>
    setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);
  const goToNext = () =>
    setCurrentImageIndex((p) => (p + 1) % images.length);
  const minSwipeDistance = 50;
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const d = touchStart - touchEnd;
    if (d > minSwipeDistance) goToNext();
    if (d < -minSwipeDistance) goToPrevious();
  };

  const formatDate = (d) => {
    if (!d) return null;
    try {
      const date = new Date(d);
      return isNaN(date.getTime())
        ? d
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-3">Product Not Found</h1>
        <p className="text-gray-500 text-sm mb-8">The product you're looking for doesn't exist.</p>
        <Link
          href="/products"
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-700 transition"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-gray-50 pb-36 sm:pb-40">
      <section className="relative w-full bg-white overflow-hidden pb-6">
        <div
          className="relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
          >
            {images.map((img, idx) => (
              <div key={idx} className="w-full flex-shrink-0 flex items-center justify-center">
                <Image
                  src={img}
                  alt={`${product.name} – image ${idx + 1}`}
                  width={1600}
                  height={1600}
                  className="w-full h-auto max-h-[120vw] sm:max-h-[90vw] object-contain"
                  sizes="100vw"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
              aria-label="Share"
            >
              <svg className="text-gray-800" style={{width:'18px',height:'18px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button onClick={goToPrevious} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm z-20" aria-label="Previous">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={goToNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm z-20" aria-label="Next">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="mt-2 flex justify-center">
            <div className="flex items-center gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`h-2 rounded-full transition-all ${idx === currentImageIndex ? 'w-7 bg-gray-800' : 'w-2 bg-gray-300'}`}
                  aria-label={`Image ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="relative z-10 bg-white rounded-t-3xl pt-6 pb-2">
        <Container>
          <div className="max-w-2xl mx-auto">
            <section
              className="space-y-5 border-b border-gray-100 pb-6 mb-6"
              aria-label="Product details"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {product.organicTag && <PillTag color="green">Organic</PillTag>}
                {product.vegNonVeg === 'veg' && <PillTag color="green">🟢 Veg</PillTag>}
                {product.vegNonVeg === 'non_veg' && <PillTag color="red">🔴 Non-veg</PillTag>}
                {discount > 0 && <PillTag color="discountGreen">{discount}% OFF</PillTag>}
                {discountValue != null && discountValue > 0 && (
                  <PillTag color="discountGreen">₹{formatRupeeINR(discountValue)} off</PillTag>
                )}
                {product.inStock ? (
                  <PillTag color="blue">In Stock</PillTag>
                ) : (
                  <PillTag color="red">Out of Stock</PillTag>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-[24px] sm:text-[32px] md:text-[36px] font-bold text-gray-900 leading-[1.15] uppercase tracking-[0.05em] text-balance">
                  {product.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-0 gap-y-2 text-[13px] sm:text-sm text-gray-600">
                  {displayWeight && (
                    <span className="font-medium text-gray-700 tabular-nums">{displayWeight}</span>
                  )}
                  {displayWeight && product.packSize && (
                    <span className="mx-2 text-gray-300 select-none" aria-hidden>
                      ·
                    </span>
                  )}
                  {product.packSize && (
                    <span>
                      Pack: <span className="font-medium text-gray-800">{product.packSize}</span>
                    </span>
                  )}
                  {(displayWeight || product.packSize) && rating > 0 && (
                    <span className="mx-2 text-gray-300 select-none" aria-hidden>
                      ·
                    </span>
                  )}
                  {rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100/80">
                      <svg className="h-3 w-3 fill-emerald-600" viewBox="0 0 24 24" aria-hidden>
                        <path d="M12 .587l3.668 7.431L24 9.75l-6 5.847 1.417 8.26L12 19.771l-7.417 4.086L6 15.597 0 9.75l8.332-1.732z" />
                      </svg>
                      {rating.toFixed(1)}
                      {product.ratingsCount > 0 && (
                        <span className="font-normal text-emerald-700/80">
                          ({product.ratingsCount})
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-0.5">
                  <span className="inline-flex min-h-[3rem] items-center rounded-xl bg-green-600 px-3.5 py-2 text-3xl font-bold text-white shadow-sm tabular-nums sm:min-h-0 sm:text-[2rem]">
                    ₹{formatRupeeINR(effectivePrice)}
                  </span>
                  {mrpDisplay != null && (
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        MRP
                      </span>
                      <span className="text-base font-medium text-gray-400 line-through tabular-nums">
                        ₹{formatRupeeINR(mrpDisplay)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {availableSizes.length > 1 && (
              <>
                <SectionLabel>Size / Variant</SectionLabel>
                <div className="flex flex-wrap gap-2 mb-5">
                  {availableSizes.map((size, i) => {
                    const isActive =
                      selectedSize?.weight === size.weight && selectedSize?.unit === size.unit;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'
                        }`}
                      >
                        {size.weight} {size.unit} — ₹
                        {formatRupeeINR(
                          product ? getEffectivePrice(product, parseFloat(size.price)) : parseFloat(size.price)
                        )}
                      </button>
                    );
                  })}
                </div>
                <Divider />
              </>
            )}

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <SectionLabel>Key Details</SectionLabel>
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {product.brand && <InfoCard label="Brand" value={product.brand} />}
                  {product.category && (
                    <InfoCard label="Category" value={product.category} />
                  )}
                  <InfoCard label="Delivery" value={deliveryTimeEstimate} />
                  {product.countryOfOrigin && (
                    <InfoCard label="Origin" value={product.countryOfOrigin} />
                  )}
                  {product.shelfLife && (
                    <InfoCard label="Shelf life" value={product.shelfLife} />
                  )}
                  <InfoCard
                    label="Returns"
                    value={product.returnable !== false ? '7-day return' : 'Non-returnable'}
                  />
                  {product.expiryDate && (
                    <InfoCard label="Best before" value={formatDate(product.expiryDate)} />
                  )}
                  {product.warranty && <InfoCard label="Warranty" value={product.warranty} />}
                </div>

                <Divider />
              </>
            )}

            {product.description && (
              <>
                <SectionLabel>Description</SectionLabel>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-5 whitespace-pre-wrap">
                  {product.description}
                </p>
                <Divider />
              </>
            )}

            {product.ingredients && (
              <>
                <SectionLabel>Ingredients</SectionLabel>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-5 whitespace-pre-wrap">
                  {product.ingredients}
                </p>
                <Divider />
              </>
            )}

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <SectionLabel>Nutritional info (per 100g)</SectionLabel>
                {nutritionalInformation ? (
                  <p className="text-[13px] text-gray-500 leading-relaxed mb-5 whitespace-pre-wrap">
                    {typeof nutritionalInformation === 'string'
                      ? nutritionalInformation
                      : JSON.stringify(nutritionalInformation)}
                  </p>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-5 text-[12px]">
                    {[
                      ['Energy', '892 kcal'],
                      ['Total fat', '99.1 g'],
                      ['Saturated fat', '82 g'],
                      ['Carbohydrates', '0 g'],
                      ['Protein', '0 g'],
                    ].map(([label, val], i) => (
                      <div
                        key={i}
                        className={`flex justify-between px-3 py-2 ${i !== 4 ? 'border-b border-gray-100' : ''} ${i === 0 ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        <span className="text-gray-500">{label}</span>
                        <span className="text-gray-800 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Divider />
              </>
            )}

            {(allergenInformation || storageInstructions) && (
              <>
                <SectionLabel>Allergens & Storage</SectionLabel>
                {allergenInformation && (
                  <p className="text-[13px] text-gray-500 leading-relaxed mb-2">{allergenInformation}</p>
                )}
                {storageInstructions && (
                  <p className="text-[13px] text-gray-500 leading-relaxed mb-5">{storageInstructions}</p>
                )}
                <Divider />
              </>
            )}

            {SHOW_PRODUCT_EXTENDED_SECTIONS && (
              <>
                <SectionLabel>Coupons & Offers</SectionLabel>
                <div className="bg-gray-50 rounded-2xl p-3.5 space-y-3 mb-5">
                  <OfferRow iconBg="bg-emerald-100" iconColor="text-emerald-700">
                    <strong>10% cashback</strong> on Amazon Pay Balance. Min order ₹299.
                  </OfferRow>
                  <OfferRow iconBg="bg-blue-100" iconColor="text-blue-700">
                    <strong>5% off</strong> with City Union Bank credit cards. No min order.
                  </OfferRow>
                  <OfferRow iconBg="bg-amber-100" iconColor="text-amber-700">
                    <strong>₹50 cashback</strong> via CRED Pay on orders above ₹499.
                  </OfferRow>
                  <OfferRow iconBg="bg-purple-100" iconColor="text-purple-700">
                    <strong>15% off</strong> your first flight booking with partner app.
                  </OfferRow>
                </div>

                <Divider />

                <SectionLabel>Customer Reviews</SectionLabel>
                <div className="space-y-2.5 mb-5">
                  <ReviewCard
                    author="Priya M."
                    rating={5}
                    text="Best product I've used. Completely natural and smells amazing. A staple in our kitchen now."
                  />
                  <ReviewCard
                    author="Rahul K."
                    rating={4}
                    text="Good quality, nice packaging. Delivery was quick. Will definitely order again."
                  />
                </div>
              </>
            )}
          </div>

          {frequentlyBoughtTogether.length > 0 && (
            <div className="mt-10">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 px-1">
                Frequently Bought Together
              </h2>
              <ProductCarousel
                products={frequentlyBoughtTogether}
                showMoreLink={
                  product.category
                    ? `/products?category=${encodeURIComponent(product.category)}`
                    : '/products'
                }
              />
            </div>
          )}

          {relatedProducts.length > 0 && (
            <div className="mt-10 mb-4">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-semibold text-gray-800">Similar Products</h2>
                <Link
                  href={`/products?category=${encodeURIComponent(product.category)}`}
                  className="text-emerald-600 text-sm font-medium hover:underline"
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

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100/90 bg-white/95 px-4 py-4 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur-md sm:px-5 sm:py-5 safe-area-pb">
        <div className="mx-auto flex max-w-2xl items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1 flex items-stretch">
            {cartQty === 0 ? (
              <button
                type="button"
                onClick={() => void handleAddToCart()}
                disabled={!product.inStock || cartActionLoading}
                className={`flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl px-4 text-sm font-semibold tracking-tight shadow-sm transition-all duration-200 sm:min-h-[3.5rem] sm:text-[15px] ${
                  product.inStock
                    ? 'bg-emerald-600 text-white shadow-emerald-600/25 hover:bg-emerald-700 hover:shadow-md active:scale-[0.99] disabled:opacity-70'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                }`}
              >
                {cartActionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-5 w-5 shrink-0 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                )}
                {product.inStock
                  ? `Add to cart · ₹${formatRupeeINR(effectivePrice)}`
                  : 'Out of Stock'}
              </button>
            ) : (
              <div className="flex min-h-[3.25rem] w-full items-stretch overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:min-h-[3.5rem]">
                <button
                  type="button"
                  onClick={() => void handleStepperDecrement()}
                  disabled={cartActionLoading}
                  className="flex min-w-[3rem] items-center justify-center bg-white text-xl font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center border-x border-gray-100 bg-white px-3 py-1.5">
                  <span className="text-base font-bold tabular-nums leading-none text-gray-900">
                    {cartQty}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium tabular-nums text-gray-500">
                    ₹{lineSubtotal}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleStepperIncrement()}
                  disabled={cartActionLoading || cartQty >= 10}
                  className="flex min-w-[3rem] items-center justify-center bg-white text-xl font-medium text-gray-700 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}
          </div>

          <Link
            href="/cart"
            className="inline-flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-green-600 px-5 text-sm font-semibold tracking-tight text-white shadow-md shadow-green-700/20 transition duration-200 hover:bg-green-700 hover:shadow-lg active:scale-[0.98] sm:min-h-[3.5rem] sm:px-6 sm:text-[15px]"
          >
            Go to cart
          </Link>
        </div>
      </div>

    </div>
  );
}
