'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const BottomNavVisibilityContext = createContext({ isVisible: true });

export function BottomNavVisibilityProvider({ children }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastYRef = useRef(0);
  const rafRef = useRef(null);

  const hideForRoute =
    pathname === '/checkout' ||
    pathname === '/order-success' ||
    pathname === '/cart' ||
    // Hide bottom nav on product detail pages
    (pathname?.startsWith('/products/') && pathname !== '/products');

  useEffect(() => {
    lastYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setIsVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (hideForRoute) return;
    if (typeof window === 'undefined') return;

    const threshold = 12;
    const onScroll = () => {
      const currentY = window.scrollY || 0;
      const lastY = lastYRef.current || 0;
      const delta = currentY - lastY;
      lastYRef.current = currentY;
      if (currentY <= 8) {
        setIsVisible(true);
        return;
      }
      if (Math.abs(delta) < threshold) return;
      if (delta > 0) setIsVisible(false);
      else setIsVisible(true);
    };

    const onScrollRaf = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        onScroll();
      });
    };

    window.addEventListener('scroll', onScrollRaf, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollRaf);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [hideForRoute]);

  const value = {
    isVisible: hideForRoute ? false : isVisible,
    hideForRoute,
  };

  return (
    <BottomNavVisibilityContext.Provider value={value}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function useBottomNavVisibility() {
  const ctx = useContext(BottomNavVisibilityContext);
  return ctx ?? { isVisible: true, hideForRoute: false };
}
