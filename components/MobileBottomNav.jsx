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

function NavIcon({ IconRegular, IconFilled, active }) {
  const Icon = active ? IconFilled : IconRegular;

  return (
    <Icon
      size={20}
      color="currentColor"
      className={`shrink-0 transition-transform duration-200 ${active ? 'scale-105' : ''}`}
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
        {navItems.map(({ href, label, IconRegular, IconFilled }) => {
          const isActive =
            pathname === href || (href !== '/' && pathname?.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-2 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                isActive ? 'text-violet-800' : 'text-gray-500 hover:bg-black/[0.04] active:scale-[0.98]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <NavIcon IconRegular={IconRegular} IconFilled={IconFilled} active={isActive} />

              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-violet-800' : 'text-gray-500'
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
