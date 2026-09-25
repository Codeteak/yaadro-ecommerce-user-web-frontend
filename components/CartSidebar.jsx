'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatRupeeINR } from '../utils/productUtils';
import { buildCartOfferGroups } from '../utils/offerDisplay';
import { useLoginNavigation } from '../hooks/useLoginNavigation';
import { useAppNavigation } from '../hooks/useAppNavigation';
import OfferGroupCard from './promotions/OfferGroupCard';
import { PRESSABLE_ICON_BTN_SOFT } from './ui/brandButton';
import { Loading2Regular as Loader2 } from './icons';

function normalizePath(pathname) {
  return pathname?.replace(/\/+$/, '') || '';
}

export default function CartSidebar() {
  const pathname = usePathname();
  const { cartItems, cartTotal, showSidebarCart, setShowSidebarCart, updateQuantity, removeFromCart } =
    useCart();
  const { isAuthenticated, authHydrated } = useAuth();
  const { goToLogin } = useLoginNavigation();
  const { navigate, prefetch } = useAppNavigation();
  const [checkoutPending, setCheckoutPending] = useState(false);
  const checkoutPendingTimerRef = useRef(null);

  const offerGroups = useMemo(() => buildCartOfferGroups(cartItems), [cartItems]);

  const handleClose = () => setShowSidebarCart(false);

  // Full cart/checkout pages already own the journey — keep the drawer closed there.
  useEffect(() => {
    const path = normalizePath(pathname);
    if (path === '/cart' || path === '/checkout') {
      setShowSidebarCart(false);
    }
  }, [pathname, setShowSidebarCart]);

  useEffect(() => {
    prefetch('/checkout');
    return () => {
      if (checkoutPendingTimerRef.current) clearTimeout(checkoutPendingTimerRef.current);
    };
  }, [prefetch]);

  const bindDrag = useDrag(
    ({ movement: [mx], velocity: [vx], last }) => {
      if (!showSidebarCart) return;
      if (last && (mx > 80 || vx > 0.6)) {
        handleClose();
      }
    },
    { axis: 'x', filterTaps: true }
  );

  const handleProceedToCheckout = () => {
    if (!authHydrated || checkoutPending) return;
    setCheckoutPending(true);
    if (checkoutPendingTimerRef.current) clearTimeout(checkoutPendingTimerRef.current);
    checkoutPendingTimerRef.current = setTimeout(() => {
      setCheckoutPending(false);
      checkoutPendingTimerRef.current = null;
    }, 8000);

    handleClose();
    if (isAuthenticated) {
      navigate('/checkout');
      return;
    }
    goToLogin('/checkout');
  };

  const handleQtyChange = (id, qty) => {
    if (qty < 1) {
      removeFromCart(id);
      return;
    }
    updateQuantity(id, qty);
  };

  const handleRemove = (id) => {
    removeFromCart(id);
  };

  return (
    <>
      {showSidebarCart ? (
        <div
          className="fixed inset-0 z-[90] bg-black/25 opacity-100 transition-opacity duration-300"
          onClick={handleClose}
          aria-hidden={false}
        />
      ) : null}

      <aside
        {...(showSidebarCart ? bindDrag() : {})}
        className={`fixed top-0 right-0 flex h-full w-full flex-col bg-white shadow-lg transition-transform duration-300 touch-pan-y sm:w-96 ${
          showSidebarCart
            ? 'z-[95] translate-x-0'
            : 'pointer-events-none invisible z-[-1] translate-x-full'
        }`}
        aria-hidden={!showSidebarCart}
        {...(!showSidebarCart ? { inert: '' } : {})}
      >
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900">Shopping Cart</h2>
          <button
            type="button"
            onClick={handleClose}
            className={`p-1.5 text-gray-400 hover:text-gray-600 rounded-lg ${PRESSABLE_ICON_BTN_SOFT}`}
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offerGroups.map((group) => (
                <OfferGroupCard
                  key={group.parentLineItemId}
                  group={group}
                  compact
                  onQuantityChange={handleQtyChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm text-gray-900 font-medium">₹{formatRupeeINR(cartTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Shipping calculated at checkout</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={!authHydrated || checkoutPending}
              aria-busy={checkoutPending}
              aria-label={checkoutPending ? 'Checking out' : 'Checkout'}
              className={`flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg px-4 py-3 text-center text-sm font-medium text-white transition-[transform,background-color,opacity] duration-150 active:scale-[0.98] disabled:opacity-70 motion-reduce:active:scale-100 ${
                checkoutPending ? 'bg-gray-800' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {checkoutPending ? (
                <>
                  <Loader2 size={16} className="h-4 w-4 animate-spin" aria-hidden />
                  Checking out…
                </>
              ) : (
                'Checkout'
              )}
            </button>

            <Link
              href="/cart"
              onClick={handleClose}
              className="block w-full py-2.5 px-4 text-gray-900 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-center"
            >
              View Cart Details
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
