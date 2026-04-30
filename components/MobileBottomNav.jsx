'use client';

import { useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useCart } from '../context/CartContext';
import ExportLink from './ExportLink';

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

const CartIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const navItems = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/categories', label: 'Categories', Icon: CategoriesIcon },
  { href: '/cart', label: 'Cart', Icon: CartIcon, showCartBadge: true },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isVisible, hideForRoute } = useBottomNavVisibility();
  const { setBottomNavHeight } = useLayoutHeights();
  const { cartCount } = useCart();
  const navRef = useRef(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBottomNavHeight(el.getBoundingClientRect().height)
    );
    ro.observe(el);
    setBottomNavHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [setBottomNavHeight]);

  if (hideForRoute) return null;

  return (
    <div
      ref={navRef}
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-center transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        willChange: 'transform',
      }}
      aria-hidden={!isVisible}
    >
      <nav
        className="flex w-[80%] max-w-[28rem] items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.10)]"
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {navItems.map(({ href, label, Icon, showCartBadge }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname?.startsWith(href));

          const count = showCartBadge ? cartCount : 0;

          return (
            <ExportLink
              key={href}
              href={href}
              prefetch
              className={`relative flex min-w-[5.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'hover:bg-black/[0.04] active:scale-[0.98]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`relative inline-flex transition-all duration-200 ${
                  isActive
                    ? 'text-white -translate-y-px scale-105'
                    : 'text-gray-500'
                }`}
              >
                {showCartBadge && count > 0 && (
                  <span
                    className={`absolute -right-1.5 -top-1.5 z-10 flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ${
                      isActive ? 'ring-emerald-500' : 'ring-white'
                    }`}
                    aria-label={`${count} items in cart`}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
                <Icon active={isActive} />
              </span>

              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </ExportLink>
          );
        })}
      </nav>
    </div>
  );
}
