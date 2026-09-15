'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import {
  ClassifyFilled,
  ClassifyRegular,
  EmptyBoxFilled,
  EmptyBoxRegular,
  Home1Filled,
  Home1Regular,
  Refresh1Filled,
  Refresh1Regular,
} from './icons';

function NavIcon({ IconRegular, IconFilled, active, size = 22 }) {
  const Icon = active ? IconFilled : IconRegular;

  return (
    <Icon
      size={size}
      color="currentColor"
      className="shrink-0"
      aria-hidden
    />
  );
}

const navItems = [
  {
    href: '/',
    label: 'Home',
    IconRegular: Home1Regular,
    IconFilled: Home1Filled,
  },
  {
    href: '/categories',
    label: 'Categories',
    IconRegular: ClassifyRegular,
    IconFilled: ClassifyFilled,
  },
  {
    href: '/products',
    label: 'Products',
    IconRegular: EmptyBoxRegular,
    IconFilled: EmptyBoxFilled,
  },
  {
    href: '/orders',
    label: 'Reorder',
    IconRegular: Refresh1Regular,
    IconFilled: Refresh1Filled,
  },
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
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 transition-transform duration-300 ease-out md:bottom-4 md:px-0 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        willChange: 'transform',
      }}
      aria-hidden={!isVisible}
    >
      <nav
        className="pointer-events-auto flex w-full max-w-lg items-center justify-around gap-0.5 rounded-[28px] bg-white px-2 py-2 shadow-[0_8px_28px_rgba(15,23,42,0.14)] md:w-auto md:max-w-none md:gap-1 md:rounded-full md:px-2.5 md:py-1.5 md:shadow-[0_10px_32px_rgba(15,23,42,0.16)]"
        aria-label="Primary"
      >
        {navItems.map(({ href, label, IconRegular, IconFilled }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname?.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`relative flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 active:scale-[0.98] ${
                isActive
                  ? 'gap-1.5 rounded-full bg-[#902bf5] px-3.5 py-2 text-white shadow-[0_4px_12px_rgba(144,43,245,0.35)] md:gap-1.5 md:px-3 md:py-1.5'
                  : 'rounded-full p-2.5 text-gray-500 hover:bg-black/[0.04] md:p-2'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
            >
              <span className="md:hidden">
                <NavIcon IconRegular={IconRegular} IconFilled={IconFilled} active={isActive} size={22} />
              </span>
              <span className="hidden md:inline-flex">
                <NavIcon IconRegular={IconRegular} IconFilled={IconFilled} active={isActive} size={18} />
              </span>
              {isActive ? (
                <span className="whitespace-nowrap text-[14px] font-semibold tracking-wide md:text-[12px]">
                  {label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
