'use client';

import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';

const BOTTOM_NAV_HEIGHT = '3.5rem'; // h-14

export default function CartFAB() {
  const pathname = usePathname();
  const { cartCount, setShowMobileCart, showMobileCart } = useCart();
  const { isVisible: bottomNavVisible, hideForRoute } = useBottomNavVisibility();

  // Hide FAB on checkout page
  if (pathname === '/checkout') return null;

  // Only show FAB on mobile devices and when cart has items
  if (cartCount === 0) return null;

  // Hide FAB when cart sheet is open
  if (showMobileCart) return null;

  // When bottom nav is visible: sit on top of it. When hidden: bottom-right corner.
  const bottomStyle = bottomNavVisible && !hideForRoute
    ? { bottom: `calc(${BOTTOM_NAV_HEIGHT} + max(8px, env(safe-area-inset-bottom)))` }
    : { bottom: '1.5rem' };

  return (
    <button
      onClick={() => setShowMobileCart(true)}
      style={bottomStyle}
      className="fixed right-6 z-30 md:hidden bg-primary text-white rounded-full w-14 h-14 shadow-lg hover:bg-primary-dark active:scale-95 transition-[bottom] duration-300 ease-out flex items-center justify-center"
      aria-label="Open cart"
    >
      {/* Cart Icon */}
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>

      {/* Cart Count Badge */}
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {cartCount > 9 ? '9+' : cartCount}
        </span>
      )}
    </button>
  );
}

