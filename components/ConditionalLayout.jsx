'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';

function normalizePath(pathname) {
  return pathname?.replace(/\/+$/, '') || '';
}

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const { bottomNavHeight } = useLayoutHeights();
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();

  const path = normalizePath(pathname);

  const hideFooter =
    path === '/order-success' ||
    path === '/checkout' ||
    path === '/login' ||
    path === '/profile' ||
    path === '/addresses' ||
    path === '/add/address' ||
    path === '/cart' ||
    path === '/orders' ||
    path.startsWith('/orders/') ||
    path === '/order' ||
    path === '/product' ||
    (pathname?.startsWith('/products/') && path !== '/products');

  const categoriesRoute = pathname?.startsWith('/categories');
  const productsListingRoute = path === '/products';
  const searchRoute = path === '/search' || pathname?.startsWith('/search/');

  const reserveBottomNavInset =
    !hideFooter ||
    categoriesRoute ||
    searchRoute ||
    productsListingRoute;

  const mainPaddingBottom =
    reserveBottomNavInset && bottomNavVisible ? bottomNavHeight : 0;

  return (
    <>
      <main
        className="flex-grow w-full max-w-full overflow-x-clip transition-[padding] duration-300 ease-out"
        style={{
          overflowX: 'clip',
          maxWidth: '100vw',
          paddingBottom: mainPaddingBottom,
        }}
      >
        {children}
      </main>
      {!hideFooter && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
    </>
  );
}
