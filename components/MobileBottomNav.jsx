'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';

const ACTIVE_ICON_CLASS = 'bg-emerald-700';
const INACTIVE_ICON_CLASS = 'bg-gray-500';

function NavIcon({ lineSrc, fillSrc, active }) {
  const src = active ? fillSrc : lineSrc;
  const colorClass = active ? ACTIVE_ICON_CLASS : INACTIVE_ICON_CLASS;

  return (
    <span
      className={`inline-block h-5 w-5 shrink-0 ${colorClass} transition-colors duration-200 ${
        active ? 'scale-105' : ''
      }`}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
      }}
      aria-hidden
    />
  );
}

const navItems = [
  {
    href: '/',
    label: 'Home',
    lineSrc: '/icons/home-line.svg',
    fillSrc: '/icons/home-fill.svg',
  },
  {
    href: '/categories',
    label: 'Categories',
    lineSrc: '/icons/apple_line.svg',
    fillSrc: '/icons/apple_fill.svg',
  },
  {
    href: '/products',
    label: 'Products',
    lineSrc: '/icons/empty_box_line.svg',
    fillSrc: '/icons/empty_box_fill.svg',
  },
  {
    href: '/orders',
    label: 'Reorder',
    lineSrc: '/icons/reorder-line.svg',
    fillSrc: '/icons/reorder-fill.svg',
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
        {navItems.map(({ href, label, lineSrc, fillSrc }) => {
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
              <NavIcon lineSrc={lineSrc} fillSrc={fillSrc} active={isActive} />

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
