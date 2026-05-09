'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { getCartLinePreviewImageSrc } from '../utils/productImages';
import { computeCartSavings } from '../utils/cartSavings';
import ProductImageWithFallback from './ProductImageWithFallback';
import CartSavingsCelebration from './CartSavingsCelebration';

/** Keep in sync with `LayoutHeightsProvider` initial `bottomNavHeight` — used when measurement lags or is 0. */
const MOBILE_BOTTOM_NAV_FALLBACK_PX = 72;
/** Visual gap between pill bottom edge and top of tab bar. */
const GAP_ABOVE_BOTTOM_NAV_PX = 14;

/** Fixed pill above the mobile bottom nav — portaled to `body` so it stacks above nav (not trapped under `<main>` overflow). */
export default function FloatingViewCartPill() {
  const [mounted, setMounted] = useState(false);
  const { cartItems, cartCount, cartTotal, loading, isCartReady } = useCart();
  const { isVisible: bottomNavVisible, hideForRoute: bottomNavHidden } = useBottomNavVisibility();
  const { bottomNavHeight } = useLayoutHeights();

  const savingsRounded = Math.round(computeCartSavings(cartItems, cartTotal));

  const baselineCapturedRef = useRef(false);
  const prevSavingsRef = useRef(0);
  const prevCartCountRef = useRef(0);
  const prevLoadingRef = useRef(loading);
  /** True once the shopper has seen an empty cart this session — avoids celebrating on first paint with a hydrated cart. */
  const userSawEmptyCartRef = useRef(false);
  const [celebrationBurst, setCelebrationBurst] = useState(0);
  const celebrationClearRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isCartReady) return;
    if (cartItems.length === 0) {
      userSawEmptyCartRef.current = true;
    }
  }, [isCartReady, cartItems.length]);

  useEffect(() => {
    if (!isCartReady) return;

    const loadingJustEnded = prevLoadingRef.current && !loading;
    prevLoadingRef.current = loading;

    const triggerCelebrationBurst = () => {
      setCelebrationBurst((k) => k + 1);
      if (celebrationClearRef.current) clearTimeout(celebrationClearRef.current);
      celebrationClearRef.current = setTimeout(() => {
        celebrationClearRef.current = null;
        setCelebrationBurst(0);
      }, 3400);
    };

    if (loading) return;

    const nextSavings = computeCartSavings(cartItems, cartTotal);

    if (cartItems.length === 0) {
      baselineCapturedRef.current = false;
      prevSavingsRef.current = 0;
      prevCartCountRef.current = 0;
      return;
    }

    // Auth: when the API cart finishes loading, resync baseline — no celebration.
    if (loadingJustEnded) {
      baselineCapturedRef.current = true;
      prevSavingsRef.current = nextSavings;
      prevCartCountRef.current = cartCount;
      return;
    }

    if (!baselineCapturedRef.current) {
      baselineCapturedRef.current = true;
      const fromEmptySnapshot =
        prevCartCountRef.current === 0 && prevSavingsRef.current === 0;
      prevSavingsRef.current = nextSavings;
      prevCartCountRef.current = cartCount;
      if (
        userSawEmptyCartRef.current &&
        fromEmptySnapshot &&
        nextSavings > 0.02 &&
        cartCount > 0
      ) {
        triggerCelebrationBurst();
      }
      return;
    }

    const addedActivity = cartCount > prevCartCountRef.current;
    const savingsIncreased = nextSavings > prevSavingsRef.current + 0.02;

    if (addedActivity && savingsIncreased && nextSavings > 0.02) {
      triggerCelebrationBurst();
    }

    prevSavingsRef.current = nextSavings;
    prevCartCountRef.current = cartCount;
  }, [isCartReady, loading, cartItems, cartTotal, cartCount]);

  useEffect(() => {
    return () => {
      if (celebrationClearRef.current) clearTimeout(celebrationClearRef.current);
    };
  }, []);

  if (!mounted || cartItems.length === 0) return null;

  const navShowing = !bottomNavHidden && bottomNavVisible;
  /** Always reserve at least one tab-bar height when the bar is on-screen (avoids pill sitting flush to viewport bottom while nav slides in / before RO fires). */
  const liftPx = navShowing
    ? Math.max(Number(bottomNavHeight) || 0, MOBILE_BOTTOM_NAV_FALLBACK_PX) + GAP_ABOVE_BOTTOM_NAV_PX
    : null;

  const pill = (
    <div
      className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-4"
      style={{
        bottom:
          liftPx != null
            ? `${liftPx}px`
            : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        transition: 'bottom 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'bottom',
      }}
      aria-hidden={cartItems.length === 0}
    >
      <Link
        href="/cart"
        className="pointer-events-auto group relative flex w-full max-w-[420px] items-center gap-3 overflow-hidden rounded-full border border-gray-200/90 bg-white/95 px-3 py-2.5 shadow-[0_8px_32px_rgba(15,23,42,0.1)] backdrop-blur-md transition-all duration-200 hover:border-gray-300 hover:bg-white hover:shadow-[0_14px_40px_rgba(15,23,42,0.12)] active:scale-[0.98]"
        aria-label={`Go to cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}${savingsRounded > 0 ? `, saving ₹${savingsRounded}` : ''}`}
      >
        {celebrationBurst > 0 && (
          <>
            <span
              key={`flash-${celebrationBurst}`}
              className="cart-savings-celebration-flash pointer-events-none absolute inset-0 z-[1] rounded-full"
              aria-hidden
            />
            <CartSavingsCelebration burstKey={celebrationBurst} />
          </>
        )}
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
          <div className="flex flex-shrink-0 -space-x-3">
            {cartItems.slice(0, 3).map((item, idx) => {
              const src = getCartLinePreviewImageSrc(item);
              const key =
                item?.cartItemKey ?? item?.cartItemId ?? item?.id ?? `${idx}`;
              return (
                <span
                  key={key}
                  className="relative inline-flex h-9 w-9 overflow-hidden rounded-full bg-gray-50 ring-2 ring-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]"
                  style={{ zIndex: 10 - idx }}
                >
                  <ProductImageWithFallback
                    src={src}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    sizes="36px"
                  />
                </span>
              );
            })}
            {cartItems.length > 3 && (
              <span
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white ring-2 ring-white shadow-[0_1px_4px_rgba(15,23,42,0.12)]"
                style={{ zIndex: 1 }}
              >
                +{cartItems.length - 3}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-medium leading-none text-gray-500">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} in cart
            </p>
            <p className="mt-1 text-sm font-bold leading-none text-gray-900">View cart</p>
            {savingsRounded > 0 && (
              <p className="mt-1 text-[11px] font-semibold leading-snug text-emerald-700">
                Saving ₹{savingsRounded.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-800 transition group-hover:border-gray-300 group-hover:bg-gray-100">
            <ShoppingCart className="h-4 w-4" strokeWidth={2.4} />
          </span>
        </div>
      </Link>
    </div>
  );

  return createPortal(pill, document.body);
}
