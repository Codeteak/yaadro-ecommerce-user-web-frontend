'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { Home, LayoutGrid, TrendingUp, Sparkles } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isVisible, hideForRoute } = useBottomNavVisibility();
  const { setBottomNavHeight } = useLayoutHeights();
  const navRef = useRef(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setBottomNavHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setBottomNavHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [setBottomNavHeight]);

  if (hideForRoute) return null;

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/categories', label: 'Categories', icon: LayoutGrid },
    { href: '/trending', label: 'Trending', icon: TrendingUp },
    { href: '/new', label: 'New', icon: Sparkles },
  ];

  return (
    <nav
      ref={navRef}
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{
        willChange: 'transform',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
      aria-hidden={!isVisible}
    >
      <div className="flex h-14 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
            >
              <span className="relative inline-flex items-center justify-center">
                <Icon
                  className={`h-6 w-6 transition-colors duration-200 ${
                    isActive ? 'text-primary fill-primary' : 'text-gray-600'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </span>
              <span
                className={`text-[11px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

