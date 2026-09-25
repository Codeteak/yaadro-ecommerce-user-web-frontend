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
  const { hideForRoute } = useBottomNavVisibility();

  const path = normalizePath(pathname);
  const hideFooter = hideSiteFooter(path);

  // Footer is in document flow — sticky bars (cart/checkout) must not lift for it.
  useEffect(() => {
    setSiteFooterHeight?.(0);
    return () => setSiteFooterHeight?.(0);
  }, [setSiteFooterHeight, path]);

  // Keep inset constant while the bar slides — toggling padding mid-scroll feels sticky.
  const navInset = !hideForRoute ? Math.max(Number(bottomNavHeight) || 0, 0) : 0;

  return (
    <main
      className="flex min-h-dvh w-full max-w-full flex-col"
      style={{
        paddingBottom: navInset,
      }}
    >
      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
      {!hideFooter ? <Footer /> : null}
    </main>
  );
}
