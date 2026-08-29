'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUiStore } from '../stores/uiStore';

const BottomNavVisibilityContext = createContext({ isVisible: true });

function normalizePath(pathname) {
  return pathname?.replace(/\/+$/, '') || '';
}

export function BottomNavVisibilityProvider({ children }) {
  const pathname = usePathname();
  const scrollNavVisible = useUiStore((s) => s.scrollNavVisible);
  const setScrollNavVisible = useUiStore((s) => s.setScrollNavVisible);
  const lastYRef = useRef(0);
  const rafRef = useRef(null);

  const path = normalizePath(pathname);

  const hideForRoute =
    path === '/login' ||
    path === '/checkout' ||
    path === '/order-success' ||
    path === '/cart' ||
    path === '/add/address' ||
    path === '/order' ||
    path.startsWith('/orders/') ||
    path === '/product' ||
    (pathname?.startsWith('/products/') && path !== '/products');

  useEffect(() => {
    lastYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setScrollNavVisible(true);
  }, [pathname, setScrollNavVisible]);

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
        setScrollNavVisible(true);
        return;
      }
      if (Math.abs(delta) < threshold) return;
      if (delta > 0) setScrollNavVisible(false);
      else setScrollNavVisible(true);
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
  }, [hideForRoute, setScrollNavVisible]);

  const value = {
    isVisible: hideForRoute ? false : scrollNavVisible,
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
