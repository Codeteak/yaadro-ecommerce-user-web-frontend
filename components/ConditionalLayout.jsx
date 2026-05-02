'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const { navbarHeight, bottomNavHeight } = useLayoutHeights();
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();

  const pathNoSlash = pathname?.replace(/\/+$/, '') || '';

  const hideLayout =
    pathname === '/order-success' ||
    pathname === '/checkout' ||
    pathname === '/profile' ||
    pathname === '/addresses' ||
    pathname === '/cart' ||
    pathname === '/orders' ||
    pathname?.startsWith('/orders/') ||
    pathNoSlash === '/order' ||
    pathNoSlash === '/product' ||
    // Product detail should be full-bleed (no header/footer)
    (pathname?.startsWith('/products/') && pathname !== '/products');

  /** Categories list + category browse: no global Navbar, but keep bottom inset for mobile nav */
  const categoriesRoute = pathname?.startsWith('/categories');

  const showNavbar = !hideLayout && !categoriesRoute;

  const mainPaddingTop = showNavbar ? navbarHeight : 0;
  const mainPaddingBottom = categoriesRoute
    ? bottomNavVisible
      ? bottomNavHeight
      : 0
    : hideLayout
      ? 0
      : bottomNavVisible
        ? bottomNavHeight
        : 0;

  return (
    <>
      {showNavbar && (
        <Suspense
          fallback={
            <header
              className="sticky top-0 z-50 w-full h-14 md:h-16 bg-white/95 border-b border-gray-100 shadow-sm"
              aria-hidden
            />
          }
        >
          <Navbar />
        </Suspense>
      )}
      <main
        className="flex-grow w-full max-w-full overflow-x-hidden transition-[padding] duration-300 ease-out"
        style={{
          overflowX: 'hidden',
          maxWidth: '100vw',
          paddingTop: mainPaddingTop,
          paddingBottom: mainPaddingBottom,
        }}
      >
        {children}
      </main>
      {!hideLayout && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
    </>
  );
}
