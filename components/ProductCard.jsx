'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import {
  getEffectivePrice,
  formatBundleRuleLabel,
  formatWeightUnitLabel,
  getPrimaryBundleRule,
  resolveProductWeightAndUnit,
} from '../utils/productUtils';
import { tapFeedback } from '../utils/haptics';
import PriceDisplay from './ui/PriceDisplay';
import WeightLabel from './ui/WeightLabel';
import OfferRibbon from './ui/OfferRibbon';
import { getResolvedProductImageUrls } from '../utils/productImages';
import { getCartLineDisplayQty } from '../utils/cartPromotions';
import { findPaidCartLine } from '../utils/cartLinePersist';
import ProductImageWithFallback from './ProductImageWithFallback';
import { getProductDetailPath } from '../utils/productApi';
import { prefetchProductDetail } from '../hooks/useProducts';

export default function ProductCard({ product, isCarousel = false, variant = 'default' }) {
  const queryClient = useQueryClient();
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
  /** Holds stepper visible until cart context catches up (API / size-key races on mobile). */
  const [pendingCartQty, setPendingCartQty] = useState(0);

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
  const productPack = useMemo(() => resolveProductWeightAndUnit(product), [product]);
  const displayWeight = selectedSize
    ? formatWeightUnitLabel(selectedSize.weight, selectedSize.unit)
    : formatWeightUnitLabel(productPack.weight, productPack.unit);

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
    () => findPaidCartLine(cartItems, product.id, selectedSize, product),
    [cartItems, product.id, selectedSize, product]
  );

  const paidCartQty = cartLine?.quantity ?? 0;
  const cartBadgeQty = cartLine ? getCartLineDisplayQty(cartLine) : 0;
  const displayCartQty = cartBadgeQty > 0 ? cartBadgeQty : pendingCartQty;

  useEffect(() => {
    if (cartBadgeQty > 0) setPendingCartQty(0);
  }, [cartBadgeQty]);
  const cartUpdateKey =
    cartLine?.cartItemKey ?? cartLine?.cartItemId ?? cartLine?.id ?? null;

  const handleAddToCart = useCallback(async () => {
    if (availableSizes.length > 1 && !selectedSize) {
      setShowSizeSelector(true);
      return;
    }
    setCartActionLoading(true);
    setPendingCartQty(1);
    try {
      await addToCart(productToAddPayload, 1);
      tapFeedback();
    } catch {
      setPendingCartQty(0);
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
      if (paidCartQty === 0 && pendingCartQty === 0) {
        setCartActionLoading(true);
        setPendingCartQty(1);
        try {
          await addToCart(productToAddPayload, 1);
          tapFeedback();
        } catch {
          setPendingCartQty(0);
          /* CartContext already alerts */
        } finally {
          setCartActionLoading(false);
        }
        return;
      }
      if (cartUpdateKey != null && paidCartQty > 0) {
        updateQuantity(cartUpdateKey, paidCartQty + 1);
        tapFeedback();
        return;
      }
      if (pendingCartQty > 0) {
        setPendingCartQty((q) => q + 1);
        setCartActionLoading(true);
        try {
          await addToCart(productToAddPayload, 1);
          tapFeedback();
        } catch {
          setPendingCartQty((q) => Math.max(0, q - 1));
        } finally {
          setCartActionLoading(false);
        }
      }
    },
    [
      cartActionLoading,
      availableSizes.length,
      selectedSize,
      paidCartQty,
      pendingCartQty,
      cartUpdateKey,
      addToCart,
      productToAddPayload,
      updateQuantity,
    ]
  );

  const stopCartBubble = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleDecrement = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartActionLoading) return;

      if (cartUpdateKey != null) {
        if (paidCartQty <= 1) {
          removeFromCart(cartUpdateKey);
        } else {
          updateQuantity(cartUpdateKey, paidCartQty - 1);
        }
        tapFeedback();
        setPendingCartQty(0);
        return;
      }

      if (pendingCartQty > 0) {
        setPendingCartQty(0);
      }
    },
    [
      cartActionLoading,
      paidCartQty,
      pendingCartQty,
      cartUpdateKey,
      removeFromCart,
      updateQuantity,
    ]
  );

  const productDetailHref = getProductDetailPath(product);

  const warmProductDetail = useCallback(() => {
    void prefetchProductDetail(queryClient, product);
  }, [queryClient, product]);

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

  const cardShellClass = `flex flex-col h-full rounded-2xl overflow-hidden touch-manipulation transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 ${chromeClass} ${
    isCarousel ? 'w-[140px]' : 'w-full'
  }`;

  const navLinkProps = {
    href: productDetailHref,
    scroll: true,
    onMouseEnter: warmProductDetail,
    onFocus: warmProductDetail,
    onTouchStart: warmProductDetail,
    onClick: (e) => {
      if (suppressNavClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        warmProductDetail();
      }
    },
  };

  const showSaveRibbon = saveRupees != null && saveRupees >= 0.005;

  const addRibbonSizeClass = isCarousel
    ? 'h-8 min-w-[52px] px-2.5 text-[10px]'
    : 'h-9 min-w-[56px] px-3 text-[11px]';

  const cartControlShellClass = isCarousel
    ? 'min-w-[72px] rounded-tl-xl rounded-br-2xl'
    : 'min-w-[76px] rounded-tl-xl rounded-br-2xl';

  const cartControls = cartActionLoading ? (
    <div
      className={`flex items-center justify-center border-2 border-violet-600 bg-white/95 shadow-sm backdrop-blur-sm ${isCarousel ? 'h-8' : 'h-9'} ${cartControlShellClass}`}
      aria-busy="true"
      aria-label="Updating cart"
    >
      <div
        className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent"
        role="status"
      />
    </div>
  ) : displayCartQty > 0 ? (
    <div
      className={`flex items-stretch overflow-hidden border-2 border-violet-600 bg-white text-violet-700 shadow-[0_4px_12px_rgba(144,43,245,0.2)] ${cartControlShellClass}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        onPointerDown={stopCartBubble}
        className="flex min-w-[26px] flex-1 items-center justify-center py-1 text-sm font-bold hover:bg-violet-50 active:bg-violet-100"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="flex min-w-[22px] items-center justify-center border-x border-violet-200 px-1 text-[11px] font-bold tabular-nums">
        {displayCartQty}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        onPointerDown={stopCartBubble}
        className="flex min-w-[26px] flex-1 items-center justify-center py-1 text-sm font-bold hover:bg-violet-50 active:bg-violet-100"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => {
        void handleAddToCart();
      }}
      onPointerDown={stopCartBubble}
      aria-label="Add to cart"
      className={`flex items-center justify-center bg-[#902bf5] font-semibold uppercase leading-none tracking-wide text-white shadow-[0_4px_12px_rgba(144,43,245,0.35)] transition hover:bg-[#7d24d6] active:scale-[0.97] ${addRibbonSizeClass} ${cartControlShellClass}`}
    >
      ADD
    </button>
  );

  return (
    <div className={cardShellClass}>
      <div className="relative">
        <Link {...navLinkProps} className="block">
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

            {showSaveRibbon && (
              <OfferRibbon saveRupees={saveRupees} compact={isCarousel} />
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
          </div>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2 min-h-0">
        {bundleLabel && (
          <span
            className={`self-start rounded-md bg-gradient-to-r from-violet-600 to-violet-700 font-bold text-white shadow-sm ${
              isCarousel
                ? 'max-w-full px-1.5 py-0.5 text-[8px] leading-tight'
                : 'px-2 py-0.5 text-[10px] leading-snug sm:text-[11px]'
            }`}
          >
            {bundleLabel}
          </span>
        )}

        <Link {...navLinkProps} className="block min-w-0 min-h-[2.5rem]">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 tracking-tight sm:text-[15px]">
            {product.name}
          </h3>
        </Link>

        <Link {...navLinkProps} className="block min-w-0">
          <WeightLabel label={displayWeight} placeholder />
        </Link>

        <Link {...navLinkProps} className="block">
          <PriceDisplay
            amount={currentPrice}
            listPrice={displayListPrice}
            size={isCarousel ? 'sm' : 'md'}
          />
        </Link>

        <div className="flex justify-end pointer-events-auto">{cartControls}</div>
      </div>
    </div>
  );
}

