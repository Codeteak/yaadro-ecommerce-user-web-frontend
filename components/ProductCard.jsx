'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import {
  getEffectivePrice,
  formatRupeeINR,
  formatBundleRuleLabel,
  getPrimaryBundleRule,
} from '../utils/productUtils';
import { getResolvedProductImageUrls } from '../utils/productImages';
import { getCartLineDisplayQty } from '../utils/cartPromotions';
import { findPaidCartLine } from '../utils/cartLinePersist';
import ProductImageWithFallback from './ProductImageWithFallback';

export default function ProductCard({ product, isCarousel = false, variant = 'default' }) {
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
  const legacyOriginal =
    product.originalPrice != null ? parseFloat(product.originalPrice) : null;
  
  const productImages = useMemo(() => getResolvedProductImageUrls(product), [product]);
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const carouselRef = useRef(null);
  /** Block navigation when user swiped the image carousel (tap vs swipe). */
  const suppressNavClickRef = useRef(false);

  const markSwipeSoNavClickIgnored = useCallback(() => {
    suppressNavClickRef.current = true;
    window.setTimeout(() => {
      suppressNavClickRef.current = false;
    }, 450);
  }, []);
  
  const imageSrc = productImages[currentImageIndex];
  
  // Get available sizes or use default weight/unit
  const availableSizes = product.sizes || (product.weight && product.unit ? [{ weight: product.weight, unit: product.unit, price: product.price }] : []);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || null);
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [cartActionLoading, setCartActionLoading] = useState(false);

  // List (MRP) per unit for selected size; effective = offer/sale when present (keeps paise).
  const basePrice = parseFloat(selectedSize ? selectedSize.price : product.price) || 0;
  const currentPrice = getEffectivePrice(product, basePrice);
  const strikeList =
    currentPrice < basePrice - 1e-9
      ? basePrice
      : legacyOriginal != null && legacyOriginal > currentPrice
        ? legacyOriginal
        : null;
  const displayListPrice =
    strikeList ??
    (basePrice > currentPrice + 1e-9 ? basePrice : null);
  /** Rupee savings for ribbon — mirrors footer line; fallback when strike list logic misses edge cases. */
  const saveRupees = useMemo(() => {
    const fromStrike =
      strikeList != null && strikeList > currentPrice + 1e-9
        ? strikeList - currentPrice
        : 0;
    if (fromStrike > 0.004) return Math.round(fromStrike * 100) / 100;
    const fromBase =
      basePrice > currentPrice + 1e-9 ? basePrice - currentPrice : 0;
    if (fromBase > 0.004) return Math.round(fromBase * 100) / 100;
    return null;
  }, [strikeList, currentPrice, basePrice]);
  const displayWeight = selectedSize ? `${selectedSize.weight} ${selectedSize.unit}` : (product.weight && product.unit ? `${product.weight} ${product.unit}` : '');

  const bundleLabel = useMemo(() => {
    const rule = getPrimaryBundleRule(product);
    return rule ? formatBundleRuleLabel(rule) : null;
  }, [product]);

  const productToAddPayload = useMemo(
    () => ({
      ...product,
      price: currentPrice,
      ...(displayListPrice != null ? { originalPrice: displayListPrice } : {}),
      selectedSize,
      sizeDisplay: displayWeight,
    }),
    [product, currentPrice, displayListPrice, selectedSize, displayWeight]
  );

  /** Cart line for this card’s product + selected size (matches CartContext keys). */
  const cartLine = useMemo(
    () => findPaidCartLine(cartItems, product.id, selectedSize),
    [cartItems, product.id, selectedSize]
  );

  const paidCartQty = cartLine?.quantity ?? 0;
  const cartBadgeQty = cartLine ? getCartLineDisplayQty(cartLine) : 0;
  const cartUpdateKey = cartLine
    ? cartLine.cartItemKey ?? cartLine.cartItemId ?? cartLine.id
    : null;

  const handleAddToCart = useCallback(async () => {
    if (availableSizes.length > 1 && !selectedSize) {
      setShowSizeSelector(true);
      return;
    }
    setCartActionLoading(true);
    try {
      await addToCart(productToAddPayload, 1);
    } catch {
      /* CartContext already alerts */
    } finally {
      setCartActionLoading(false);
    }
  }, [availableSizes.length, selectedSize, addToCart, productToAddPayload]);

  const handleIncrement = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartActionLoading) return;
      if (availableSizes.length > 1 && !selectedSize) {
        setShowSizeSelector(true);
        return;
      }
      if (paidCartQty === 0) {
        setCartActionLoading(true);
        try {
          await addToCart(productToAddPayload, 1);
        } catch {
          /* CartContext already alerts */
        } finally {
          setCartActionLoading(false);
        }
        return;
      }
      if (cartUpdateKey != null) {
        updateQuantity(cartUpdateKey, paidCartQty + 1);
      }
    },
    [
      cartActionLoading,
      availableSizes.length,
      selectedSize,
      paidCartQty,
      cartUpdateKey,
      addToCart,
      productToAddPayload,
      updateQuantity,
    ]
  );

  const handleDecrement = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartActionLoading) return;
      if (!cartLine || paidCartQty <= 0 || cartUpdateKey == null) return;
      if (paidCartQty <= 1) {
        removeFromCart(cartUpdateKey);
      } else {
        updateQuantity(cartUpdateKey, paidCartQty - 1);
      }
    },
    [cartActionLoading, cartLine, paidCartQty, cartUpdateKey, removeFromCart, updateQuantity]
  );

  const productSlugOrId = product.slug || product.id;

  const chromeClass =
    variant === 'flat'
      ? 'border-0 bg-transparent shadow-none hover:shadow-none hover:border-transparent active:shadow-none'
      : 'border border-gray-200 bg-white hover:shadow-md hover:border-gray-200 active:shadow-lg active:border-gray-300';

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product?.id, productImages.join('|')]);

  // Handle swipe gestures
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
    
    if (isLeftSwipe && productImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
      markSwipeSoNavClickIgnored();
    }
    if (isRightSwipe && productImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
      markSwipeSoNavClickIgnored();
    }
  };

  // Handle mouse drag (for desktop)
  const onMouseDown = (e) => {
    setTouchStart(e.clientX);
  };

  const onMouseMove = (e) => {
    if (touchStart !== null) {
      setTouchEnd(e.clientX);
    }
  };

  const onMouseUp = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;
      
      if (isLeftSwipe && productImages.length > 1) {
        setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
        markSwipeSoNavClickIgnored();
      }
      if (isRightSwipe && productImages.length > 1) {
        setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
        markSwipeSoNavClickIgnored();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <Link
      href={`/product?id=${encodeURIComponent(String(productSlugOrId ?? '').trim())}`}
      scroll
      onClick={(e) => {
        if (suppressNavClickRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={`flex flex-col h-full rounded-2xl overflow-hidden touch-manipulation transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 ${chromeClass} ${
        isCarousel ? 'w-[140px]' : 'w-full'
      }`}
    >
      <div className="relative">
          <div
            ref={carouselRef}
            className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl max-h-[120px] cursor-grab active:cursor-grabbing pointer-events-auto"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div 
              className="relative z-0 flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {productImages.map((img, idx) => (
                <div key={`${idx}-${img}`} className="relative w-full h-full flex-shrink-0">
                  <ProductImageWithFallback
                    src={img}
                    alt={`${product.name} – image ${idx + 1}`}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
              ))}
            </div>

            {saveRupees != null && saveRupees >= 0.005 && (
              <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl" aria-hidden>
                <div
                  className={`absolute flex items-center justify-center whitespace-nowrap bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-center font-extrabold uppercase leading-none tracking-wide text-white shadow-[0_3px_10px_rgba(153,27,27,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] ${
                    isCarousel
                      ? 'left-[-50px] top-[8px] min-h-[22px] w-[134px] -rotate-45 px-1 py-2 text-[8px]'
                      : 'left-[-46px] top-[11px] min-h-[28px] w-[158px] -rotate-45 px-1.5 py-2.5 text-[9px] sm:left-[-42px] sm:top-[14px] sm:min-h-[30px] sm:w-[170px] sm:py-3 sm:text-[10px]'
                  }`}
                >
                  <span className="tabular-nums">Save ₹{formatRupeeINR(saveRupees)}</span>
                </div>
              </div>
            )}

            {productImages.length > 1 && (
              <div
                className="absolute top-2 right-2 z-10 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums"
                aria-label={`Image ${currentImageIndex + 1} of ${productImages.length}`}
              >
                {currentImageIndex + 1}/{productImages.length}
              </div>
            )}

            {/* Image indicators — tap to select (multiple images only) */}
            {productImages.length > 1 && (
              <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 transform gap-1 z-10">
                {productImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Show image ${idx + 1}`}
                    aria-current={idx === currentImageIndex ? 'true' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markSwipeSoNavClickIgnored();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-1.5 w-1.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
            
            {/* Add / quantity stepper overlay at bottom right */}
            {cartActionLoading ? (
              <div
                className="absolute bottom-2 right-2 z-10 flex h-[30px] min-w-[72px] items-center justify-center rounded-lg border-2 border-pink-500 bg-white/95 shadow-sm backdrop-blur-sm"
                aria-busy="true"
                aria-label="Updating cart"
              >
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent"
                  role="status"
                />
              </div>
            ) : cartBadgeQty > 0 ? (
              <div
                className="absolute bottom-2 right-2 z-10 flex items-stretch overflow-hidden rounded-lg border-2 border-pink-500 bg-white text-pink-600 shadow-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="flex min-w-[28px] items-center justify-center px-1.5 py-1 text-sm font-bold hover:bg-pink-50 active:bg-pink-100"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="flex min-w-[22px] items-center justify-center border-x border-pink-200 px-1 text-[11px] font-bold tabular-nums">
                  {cartBadgeQty}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="flex min-w-[28px] items-center justify-center px-1.5 py-1 text-sm font-bold hover:bg-pink-50 active:bg-pink-100"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleAddToCart();
                }}
                className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-pink-500 bg-white text-pink-600 shadow-sm transition hover:bg-pink-50"
                aria-label="Add to cart"
              >
                <span className="text-[22px] font-extrabold leading-none">+</span>
              </button>
            )}
          </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2 min-h-0">
        <div className="flex min-h-[34px] flex-col gap-1">
          {bundleLabel && (
            <span
              className={`self-start rounded-md bg-gradient-to-r from-emerald-600 to-emerald-700 font-bold text-white shadow-sm ${
                isCarousel
                  ? 'max-w-full px-1.5 py-0.5 text-[8px] leading-tight'
                  : 'px-2 py-0.5 text-[10px] leading-snug sm:text-[11px]'
              }`}
            >
              {bundleLabel}
            </span>
          )}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="inline-flex items-center rounded-md bg-green-600 px-2 py-1 text-base font-bold tabular-nums text-white shadow-sm">
              ₹{formatRupeeINR(currentPrice)}
            </span>
            {displayListPrice != null && (
              <span className="text-xs text-gray-400 line-through tabular-nums">
                ₹{formatRupeeINR(displayListPrice)}
              </span>
            )}
            {saveRupees != null && (
              <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                Save ₹{formatRupeeINR(saveRupees)}
              </span>
            )}
          </div>
        </div>

        <div className="block min-w-0 min-h-[2.5rem]">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 tracking-tight sm:text-[15px]">
            {product.name}
          </h3>
        </div>

        <p className="mt-auto text-[11px] text-gray-500 leading-none min-h-[12px]">
          {displayWeight ? `1 pack · ${displayWeight}` : '\u00A0'}
        </p>
      </div>
    </Link>
  );
}

