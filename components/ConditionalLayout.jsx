'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import Footer from './Footer';

function normalizePath(pathname) {
  return pathname?.replace(/\/+$/, '') || '';
}

/** Routes where sticky CTAs own the bottom — brand footer breaks the flow. */
function hideSiteFooter(path) {
  return (
    path === '/login' ||
    path === '/cart' ||
    path === '/checkout' ||
    path === '/order-success'
  );
}

/**
 * Brand footer scrolls with page content (end of main).
 * Only the mobile tab bar stays fixed — a fixed brand footer was covering
 * the lower viewport on every page and forced unnecessary scrolling.
 */
export default function ConditionalLayout({ children }) {
  const pathname = usePathname();
  const { bottomNavHeight, setSiteFooterHeight } = useLayoutHeights();
  const { isVisible: bottomNavVisible, hideForRoute } = useBottomNavVisibility();

  const path = normalizePath(pathname);
  const hideFooter = hideSiteFooter(path);

  // Footer is in document flow — sticky bars (cart/checkout) must not lift for it.
  useEffect(() => {
    setSiteFooterHeight?.(0);
    return () => setSiteFooterHeight?.(0);
  }, [setSiteFooterHeight, path]);

  const navInset =
    !hideForRoute && bottomNavVisible ? Math.max(Number(bottomNavHeight) || 0, 0) : 0;

  return (
    <main
      className="flex w-full max-w-full flex-grow flex-col overflow-x-clip"
      style={{
        overflowX: 'clip',
        paddingBottom: navInset,
      }}
    >
      <div className="w-full min-w-0 flex-1">{children}</div>
      {!hideFooter ? <Footer /> : null}
    </main>
  );
}
