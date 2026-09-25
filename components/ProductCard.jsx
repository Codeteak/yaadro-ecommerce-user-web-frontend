'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import {
  getEffectivePrice,
  getListPrice,
  formatBundleRuleLabel,
  formatBundleRibbonLabel,
  formatWeightUnitLabel,
  formatRupeeINR,
  getPrimaryBundleRule,
  bundleRuleRoleForProduct,
  resolveProductWeightAndUnit,
} from '../utils/productUtils';
import { getProductOfferDisplay } from '../utils/offerDisplay';
import { buildAvailableSizes, resolveSelectedSize, sizePackCount, sizeAddQuantity, cartQuantityStep, weightStepLinePrices, isSoldByWeightProduct, formatCartQtyControlLabel } from '../utils/productSizeSelection';
import { tapFeedback } from '../utils/haptics';
import PriceDisplay from './ui/PriceDisplay';
import OfferRibbon from './ui/OfferRibbon';
import BundleOfferRibbon from './ui/BundleOfferRibbon';
import { DietIcon, resolveProductDiet } from './ui/DietIcon';
import { getResolvedProductImageUrls } from '../utils/productImages';
import { getCartLinePaidQty } from '../utils/cartPromotions';
import { findPaidCartLine } from '../utils/cartLinePersist';
import ProductImageWithFallback from './ProductImageWithFallback';
import { getProductDetailPath } from '../utils/productApi';
import { prefetchProductDetail } from '../hooks/useProducts';
import { useShopBranding } from '../context/ShopBrandingContext';
import { PRESSABLE_BTN } from './ui/brandButton';

export default function ProductCard({ product, isCarousel = false, variant = 'default' }) {
  const queryClient = useQueryClient();
  const { shopId } = useShopBranding();
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
    }, 280);
  }, []);
  
  const imageSrc = productImages[currentImageIndex];
  
  // Get available sizes or use default weight/unit
  const availableSizes = useMemo(() => buildAvailableSizes(product), [product]);
  const [selectedSize, setSelectedSize] = useState(() => availableSizes[0] || null);
  /** Always read price from latest catalog row (selectedSize state can hold stale price). */
  const activeSize = useMemo(
    () => resolveSelectedSize(availableSizes, selectedSize),
    [availableSizes, selectedSize]
  );

  useEffect(() => {
    setSelectedSize((prev) => resolveSelectedSize(availableSizes, prev));
  }, [availableSizes, product?.id, product?.price, product?.actualPriceMinor]);

  const [cartActionLoading, setCartActionLoading] = useState(false);
  /** Holds stepper visible until cart context catches up (API / size-key races on mobile). */
  const [pendingCartQty, setPendingCartQty] = useState(0);

  const stepLinePrices = useMemo(
    () => weightStepLinePrices(product, activeSize),
    [product, activeSize]
  );

  // Custom weight chips: show pay for the selected step (e.g. ₹11.25 for 250 g), never full ₹/kg.
  const basePrice = stepLinePrices
    ? stepLinePrices.list
    : parseFloat(activeSize ? activeSize.price : product.price) || 0;
  const currentPrice = stepLinePrices
    ? stepLinePrices.pay
    : getEffectivePrice(product, basePrice);
  const strikeList = stepLinePrices
    ? stepLinePrices.list > stepLinePrices.pay + 1e-9
      ? stepLinePrices.list
      : null
    : currentPrice < basePrice - 1e-9
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
  const displayWeight = activeSize?.label
    ? activeSize.label
    : activeSize
      ? formatWeightUnitLabel(activeSize.weight, activeSize.unit)
      : formatWeightUnitLabel(productPack.weight, productPack.unit);
  const addQty = sizeAddQuantity(product, activeSize);
  const weightStep =
    activeSize?.weightStep === true || availableSizes.some((size) => size.weightStep === true);
  const showPackChips =
    availableSizes.length > 1 &&
    (weightStep || isSoldByWeightProduct(product));

  const bundleRule = useMemo(() => getPrimaryBundleRule(product), [product]);
  const offerDisplay = useMemo(() => getProductOfferDisplay(product), [product]);
  const bundleLabel = useMemo(() => {
    if (offerDisplay.bundleLabel) return offerDisplay.bundleLabel;
    if (bundleRule) return formatBundleRuleLabel(bundleRule);
    const extra = String(product?.bundleLabel || '').trim();
    return extra || null;
  }, [offerDisplay.bundleLabel, bundleRule, product?.bundleLabel]);

  const productToAddPayload = useMemo(
    () => ({
      ...product,
      // Weight steps keep the per-kg price. The chip price is step × that price.
      price: activeSize?.weightStep ? getEffectivePrice(product) : currentPrice,
      ...(activeSize?.weightStep
        ? (() => {
            const list = getListPrice(product);
            const pay = getEffectivePrice(product);
            return list > pay + 1e-9 ? { originalPrice: list } : {};
          })()
        : displayListPrice != null
          ? { originalPrice: displayListPrice }
          : {}),
      selectedSize: activeSize,
      sizeDisplay: displayWeight,
    }),
    [product, currentPrice, displayListPrice, activeSize, displayWeight]
  );

  /** Cart line for this card’s product + selected size (matches CartContext keys). */
  const cartLine = useMemo(
    () => findPaidCartLine(cartItems, product.id, activeSize, product),
    [cartItems, product.id, activeSize, product]
  );

  const paidCartQty = cartLine ? getCartLinePaidQty(cartLine) : 0;
  const displayCartQty = paidCartQty > 0 ? paidCartQty : pendingCartQty;
  const qtyStep = cartQuantityStep(product);
  const qtyControlLabel = formatCartQtyControlLabel(
    cartLine || product,
    displayCartQty
  );
  const atMinPack =
    isSoldByWeightProduct(product)
      ? displayCartQty <= qtyStep + 1e-9
      : displayCartQty <= 1;

  useEffect(() => {
    if (paidCartQty > 0) setPendingCartQty(0);
  }, [paidCartQty]);
  const cartUpdateKey =
    cartLine?.cartItemKey ?? cartLine?.cartItemId ?? cartLine?.id ?? null;

  const handleAddToCart = useCallback(async () => {
    if (product?.inStock === false) return;
    if (String(product?.bxgyShelfRole || '').trim() === 'get') return;
    // activeSize already falls back to availableSizes[0] — never gate on selectedSize
    // alone (that left an invisible showSizeSelector path that ate the first tap).
    if (cartActionLoading) return;
    const shelfBuy = Math.floor(Number(product?.bxgyBuyQty));
    const qtyToAdd =
      String(product?.bxgyShelfRole || '').trim() === 'buy' &&
      Number.isFinite(shelfBuy) &&
      shelfBuy > 1
        ? Math.max(addQty, shelfBuy)
        : addQty;
    setCartActionLoading(true);
    setPendingCartQty(qtyToAdd);
    try {
      await addToCart(productToAddPayload, qtyToAdd);
      tapFeedback();
    } catch {
      setPendingCartQty(0);
      /* CartContext already alerts */
    } finally {
      setCartActionLoading(false);
    }
  }, [
    cartActionLoading,
    addToCart,
    productToAddPayload,
    addQty,
    product?.inStock,
    product?.bxgyShelfRole,
    product?.bxgyBuyQty,
  ]);

  const handleIncrement = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartActionLoading) return;
      if (String(product?.bxgyShelfRole || '').trim() === 'get') return;
      if (product?.inStock === false) return;
      if (paidCartQty === 0 && pendingCartQty === 0) {
        setCartActionLoading(true);
        setPendingCartQty(addQty);
        try {
          await addToCart(productToAddPayload, addQty);
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
        const step = cartQuantityStep(product);
        updateQuantity(
          cartUpdateKey,
          Math.round((paidCartQty + step) * 10000) / 10000
        );
        tapFeedback();
        return;
      }
      if (pendingCartQty > 0) {
        const step = cartQuantityStep(product);
        setPendingCartQty((q) => Math.round((q + step) * 10000) / 10000);
        setCartActionLoading(true);
        try {
          await addToCart(productToAddPayload, step);
          tapFeedback();
        } catch {
          setPendingCartQty((q) => Math.max(0, Math.round((q - step) * 10000) / 10000));
        } finally {
          setCartActionLoading(false);
        }
      }
    },
    [
      cartActionLoading,
      paidCartQty,
      pendingCartQty,
      cartUpdateKey,
      addToCart,
      productToAddPayload,
      updateQuantity,
      addQty,
      product,
      product?.inStock,
    ]
  );

  /** Keep cart taps from activating nested Link navigation; do not stop pointerdown
   *  so SmoothDragRail can still arm horizontal drag when the gesture starts on ADD. */
  const stopCartBubble = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleDecrement = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartActionLoading) return;

      if (cartUpdateKey != null) {
        const step = cartQuantityStep(product);
        if (paidCartQty <= step + 1e-9) {
          removeFromCart(cartUpdateKey);
        } else {
          updateQuantity(
            cartUpdateKey,
            Math.round((paidCartQty - step) * 10000) / 10000
          );
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
      product,
    ]
  );

  const productDetailHref = getProductDetailPath(product);

  const warmProductDetail = useCallback(() => {
    void prefetchProductDetail(queryClient, product, shopId);
  }, [queryClient, product, shopId]);

  const isShelf = variant === 'shelf';
  const shelfRole = String(product?.bxgyShelfRole || '').trim();
  const shelfMode = String(product?.bxgyOfferMode || '').trim();
  // Prefer engine role for cross BUY/FREE ribbons on PLP (not only Damaka shelf).
  const engineRole = bundleRule
    ? bundleRuleRoleForProduct(bundleRule, product?.id)
    : 'same';
  const ribbonRole =
    shelfMode === 'cross_sku' && (shelfRole === 'buy' || shelfRole === 'get')
      ? shelfRole
      : shelfRole === 'get' || engineRole === 'get'
        ? 'get'
        : shelfRole === 'buy' || engineRole === 'buy'
          ? 'buy'
          : 'same';
  const bundleRibbonText =
    offerDisplay.bundleRibbon ||
    (bundleRule
      ? formatBundleRibbonLabel(bundleRule, {
          compact: isCarousel || isShelf,
          role: ribbonRole,
        })
      : bundleLabel);

  const chromeClass =
    variant === 'flat'
      ? 'border-0 bg-transparent shadow-none'
      : 'bg-white';

  const dietKind = resolveProductDiet(product);
  const unitOverlayLabel = String(displayWeight || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
  const isUnavailable = product?.inStock === false;

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

  const inHorizontalRail = isShelf || isCarousel;

  // Never use touch-pan-x on cards: it blocks vertical page scroll when the
  // finger starts on the image (most of the card). Horizontal movement stays
  // with the parent SmoothDragRail (overflow-x / pointer drag).
  const cardShellClass = `flex h-full flex-col overflow-hidden rounded-[20px] transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 [@media(hover:hover)_and_(pointer:fine)]:active:scale-[0.97] ${chromeClass} ${
    inHorizontalRail
      ? 'w-[173px] max-w-[173px] shrink-0 touch-manipulation'
      : 'w-full touch-manipulation'
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

  const showSaveRibbon =
    !product?.bxgyShelfRole &&
    saveRupees != null &&
    saveRupees >= 0.005;

  const discountPct = Number(product?.discountPercentage);
  const showPercentOff =
    showSaveRibbon &&
    Number.isFinite(discountPct) &&
    discountPct >= 1 &&
    discountPct <= 95;

  const brandLabel = String(product?.brand || '').trim();

  // Offer Damaka free reward: show only — do not allow separate add-to-cart.
  const isDamakaFreeReward = shelfRole === 'get';
  const damakaBuyQty =
    Number.isFinite(Number(product?.bxgyBuyQty)) && Number(product.bxgyBuyQty) > 0
      ? Math.floor(Number(product.bxgyBuyQty))
      : 1;

  const cartControls = isDamakaFreeReward ? (
    <div
      className="flex h-9 min-w-[68px] items-center justify-center rounded-l-[22px] rounded-r-[10px] bg-emerald-600 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm"
      aria-label="Free with offer — added when you buy the paired product"
    >
      Free
    </div>
  ) : cartActionLoading ? (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
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
      className="flex h-9 min-w-[96px] items-center justify-between rounded-full bg-white px-2 ring-2 ring-[#902bf5] shadow-[0_8px_20px_rgba(144,43,245,0.35)]"
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        onClick={handleDecrement}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[#902bf5] active:scale-95"
        aria-label={atMinPack ? 'Remove from cart' : 'Decrease quantity'}
      >
        <span className="text-base font-bold leading-none">−</span>
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-[#902bf5]">
        {qtyControlLabel}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[#902bf5] active:scale-95"
        aria-label="Increase quantity"
      >
        <span className="text-base font-bold leading-none">+</span>
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
      aria-label={
        shelfRole === 'buy' && damakaBuyQty > 1
          ? `Add ${damakaBuyQty} to cart for this offer`
          : 'Add to cart'
      }
      className="flex h-9 min-w-[68px] items-center justify-center rounded-l-[22px] rounded-r-[10px] bg-[#902bf5] px-4 text-[12px] font-bold uppercase leading-none tracking-[0.14em] text-white shadow-[0_8px_20px_rgba(144,43,245,0.4)] transition hover:bg-[#7d24d6] active:scale-[0.97] touch-manipulation"
    >
      {shelfRole === 'buy' && damakaBuyQty > 1 ? `ADD ${damakaBuyQty}` : 'ADD'}
    </button>
  );

  return (
    <article className={cardShellClass}>
      <div className="relative w-full shrink-0 overflow-hidden rounded-t-[20px] bg-gray-50">
        <Link {...navLinkProps} className="block">
          <div
            ref={carouselRef}
            className={`relative aspect-square w-full overflow-hidden bg-gray-50 pointer-events-auto ${
              inHorizontalRail ? '' : 'cursor-grab active:cursor-grabbing'
            }`}
            onTouchStart={inHorizontalRail ? undefined : onTouchStart}
            onTouchMove={inHorizontalRail ? undefined : onTouchMove}
            onTouchEnd={inHorizontalRail ? undefined : onTouchEnd}
            onMouseDown={inHorizontalRail ? undefined : onMouseDown}
            onMouseMove={inHorizontalRail ? undefined : onMouseMove}
            onMouseUp={inHorizontalRail ? undefined : onMouseUp}
            onMouseLeave={inHorizontalRail ? undefined : onMouseUp}
          >
            <div
              className="relative z-0 flex h-full min-h-0 w-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
            >
              {productImages.map((img, idx) => (
                <div key={`${idx}-${img}`} className="relative h-full min-h-0 w-full flex-shrink-0">
                  <ProductImageWithFallback
                    src={img}
                    alt={`${product.name} – image ${idx + 1}`}
                    fill
                    className={`object-contain object-center ${
                      isUnavailable ? 'brightness-[0.55] grayscale' : ''
                    }`}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 173px"
                    placeholderName={product.name}
                    placeholderCategory={
                      product.categoryName ||
                      product.category?.name ||
                      (typeof product.category === 'string' ? product.category : '') ||
                      product.primaryCategoryName ||
                      ''
                    }
                  />
                </div>
              ))}
            </div>

            {isUnavailable ? (
              <div className="absolute inset-0 z-[2] flex flex-col justify-end">
                <div className="bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2 pb-2 pt-10 text-center">
                  <p className="text-[10px] font-extrabold uppercase leading-tight tracking-[0.08em] text-white">
                    Out of stock
                  </p>
                </div>
              </div>
            ) : null}

            {showSaveRibbon ? (
              showPercentOff ? (
                <div
                  className={`pointer-events-none absolute left-0 top-2 z-30 ${
                    isCarousel ? 'max-w-[85%]' : 'max-w-[90%]'
                  }`}
                >
                  <span className="inline-flex items-center rounded-r-md bg-emerald-600 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                    {Math.round(discountPct)}% OFF
                  </span>
                </div>
              ) : (
                <OfferRibbon saveRupees={saveRupees} compact={isCarousel} />
              )
            ) : null}
            {bundleRibbonText ? (
              <BundleOfferRibbon
                label={bundleRibbonText}
                compact={isCarousel || isShelf}
                offset={showSaveRibbon}
              />
            ) : null}

            {!isCarousel && productImages.length > 1 ? (
              <div
                className="absolute right-2 top-2 z-10 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white"
                aria-label={`Image ${currentImageIndex + 1} of ${productImages.length}`}
              >
                {currentImageIndex + 1}/{productImages.length}
              </div>
            ) : null}
          </div>
        </Link>

        {(dietKind || unitOverlayLabel) ? (
          <div
            className={`absolute bottom-0 left-0 z-[1] flex items-center gap-1 bg-white py-1.5 pl-2 pr-2.5 ${
              isUnavailable ? 'opacity-90' : ''
            }`}
            style={{ borderTopRightRadius: 12 }}
          >
            {dietKind ? <DietIcon isVeg={dietKind === 'veg'} className="size-3.5 shrink-0" /> : null}
            {unitOverlayLabel ? (
              <span className="text-[11px] font-bold leading-none text-gray-900">{unitOverlayLabel}</span>
            ) : null}
          </div>
        ) : null}

        {!isUnavailable ? (
          <div
            className="absolute z-10 flex justify-end"
            style={{ right: 10, bottom: 10 }}
            onClick={stopCartBubble}
          >
            {cartControls}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-1.5">
        <Link {...navLinkProps} className="block min-w-0" title={product.name}>
          {brandLabel ? (
            <p className="mb-0.5 h-[14px] truncate text-[10px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-gray-500">
              {brandLabel}
            </p>
          ) : inHorizontalRail ? (
            <p className="mb-0.5 h-[14px]" aria-hidden />
          ) : null}
          <h3 className="h-8 line-clamp-2 text-[13px] font-bold leading-4 tracking-tight text-gray-900">
            {product.name}
          </h3>
          {/* Always reserve offer line height so sale vs non-sale cards stay even */}
          <p
            className={`mt-0.5 h-[14px] line-clamp-1 text-[11px] leading-[14px] ${
              offerDisplay.secondaryText && !bundleRibbonText
                ? 'text-violet-700'
                : 'text-transparent'
            }`}
          >
            {offerDisplay.secondaryText && !bundleRibbonText
              ? offerDisplay.secondaryText
              : '\u00a0'}
          </p>
        </Link>

        {showPackChips ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {availableSizes.map((size) => {
              const active = sizePackCount(activeSize) === sizePackCount(size);
              const chipPrices = weightStepLinePrices(product, size);
              const chipPay = chipPrices
                ? chipPrices.pay
                : getEffectivePrice(product, parseFloat(size.price));
              return (
                <button
                  key={`${size.packCount}-${size.weight}-${size.unit}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedSize(size);
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight ${PRESSABLE_BTN} ${
                    active
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {size.label || formatWeightUnitLabel(size.weight, size.unit)}
                  <span className="ml-1 font-bold tabular-nums">₹{formatRupeeINR(chipPay)}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <Link
          {...navLinkProps}
          className="mt-auto flex min-h-5 items-end pt-0.5"
        >
          {product?.bxgyShelfRole === 'get' ? (
            <div className="text-base font-bold leading-5">
              <span className="text-violet-700">Free</span>
              {displayListPrice != null && displayListPrice > 0 ? (
                <span className="ml-1.5 text-xs font-medium text-gray-400 line-through tabular-nums">
                  ₹{formatRupeeINR(displayListPrice)}
                </span>
              ) : currentPrice > 0 ? (
                <span className="ml-1.5 text-xs font-medium text-gray-400 line-through tabular-nums">
                  ₹{formatRupeeINR(currentPrice)}
                </span>
              ) : null}
            </div>
          ) : (
            <PriceDisplay amount={currentPrice} listPrice={displayListPrice} size="sm" />
          )}
        </Link>
      </div>
    </article>
  );
}

