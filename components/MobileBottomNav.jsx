'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';

const HomeIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const CategoriesIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const ProductsIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const ReorderIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-3.2-6.9" />
    <polyline points="21 4 21 9 16 9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const navItems = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/categories', label: 'Categories', Icon: CategoriesIcon },
  { href: '/products', label: 'Products', Icon: ProductsIcon },
  { href: '/orders', label: 'Reorder', Icon: ReorderIcon },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isVisible, hideForRoute } = useBottomNavVisibility();
  const { setBottomNavHeight } = useLayoutHeights();
  const navRef = useRef(null);

  useEffect(() => {
    if (hideForRoute) {
      setBottomNavHeight(0);
      return;
    }
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBottomNavHeight(el.getBoundingClientRect().height)
    );
    ro.observe(el);
    setBottomNavHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [hideForRoute, setBottomNavHeight]);

  if (hideForRoute) return null;

  return (
    <div
      ref={navRef}
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-black/10 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingTop: '8px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        willChange: 'transform',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      aria-hidden={!isVisible}
    >
      <nav className="flex w-full items-center justify-around gap-1 px-2">
        {navItems.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname?.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                isActive ? 'text-emerald-800' : 'text-gray-500 hover:bg-black/[0.04] active:scale-[0.98]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`relative inline-flex transition-all duration-200 ${
                  isActive ? 'text-emerald-800 -translate-y-px scale-105' : 'text-gray-500'
                }`}
              >
                <Icon active={isActive} />
              </span>

              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-emerald-800' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
