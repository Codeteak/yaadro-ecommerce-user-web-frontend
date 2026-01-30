'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';

export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const { navbarHeight, bottomNavHeight } = useLayoutHeights();
  const { isVisible: bottomNavVisible } = useBottomNavVisibility();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const hideLayout =
    pathname === '/order-success' ||
    pathname === '/checkout' ||
    pathname === '/profile' ||
    pathname === '/settings' ||
    pathname === '/addresses' ||
    pathname === '/cart' ||
    pathname === '/orders' ||
    pathname?.startsWith('/orders/');

  const mainPaddingTop = hideLayout ? 0 : navbarHeight;
  const mainPaddingBottom = hideLayout ? 0 : (isMobile && bottomNavVisible ? bottomNavHeight : 0);

  return (
    <>
      {!hideLayout && <Navbar />}
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
      {!hideLayout && !isMobile && <Footer />}
    </>
  );
}
