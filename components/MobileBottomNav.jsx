'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { History, House, LayoutGrid, ShoppingBag } from 'lucide-react';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';
import { useUiStore } from '../stores/uiStore';

const navItems = [
  { href: '/', label: 'Home', Icon: House },
  { href: '/categories', label: 'Categories', Icon: LayoutGrid },
  { href: '/products', label: 'Products', Icon: ShoppingBag },
  { href: '/orders', label: 'Reorder', Icon: History },
];

const PILL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

function pathIsActive(pathname, href) {
  if (!pathname) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  const target = href.replace(/\/+$/, '') || '/';
  if (target === '/') return path === '/';
  return path === target || path.startsWith(`${target}/`);
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { hideForRoute, isVisible } = useBottomNavVisibility();
  const { setBottomNavHeight } = useLayoutHeights();
  const setScrollNavVisible = useUiStore((s) => s.setScrollNavVisible);
  const navRef = useRef(null);
  const trackRef = useRef(null);
  const itemRefs = useRef([]);
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false });

  const activeIndex = Math.max(
    0,
    navItems.findIndex(({ href }) => pathIsActive(pathname, href))
  );

  const measurePill = useCallback(() => {
    const track = trackRef.current;
    const item = itemRefs.current[activeIndex];
    if (!track || !item) return;
    const trackRect = track.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    setPill({
      x: itemRect.left - trackRect.left,
      w: itemRect.width,
      ready: true,
    });
  }, [activeIndex]);

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

  useLayoutEffect(() => {
    if (hideForRoute) return undefined;
    measurePill();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measurePill());
    ro.observe(track);
    itemRefs.current.forEach((node) => {
      if (node) ro.observe(node);
    });
    window.addEventListener('resize', measurePill);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measurePill);
    };
  }, [hideForRoute, measurePill, pathname, isVisible]);

  if (hideForRoute) return null;

  const showBar = isVisible !== false;

  return (
    <div
      ref={navRef}
      className={`mobile-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 w-full min-w-0 overflow-x-clip transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
        showBar ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!showBar}
    >
      <nav
        className={`w-full min-w-0 overflow-hidden rounded-t-[24px] border-t border-black/[0.06] bg-white px-1.5 pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] ${
          showBar ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
        aria-label="Primary"
      >
        <div
          ref={trackRef}
          className="mobile-bottom-nav-track relative flex w-full min-w-0 items-center"
        >
          {/* Sliding active pill — transform/width only (GPU-friendly, no Framer layout) */}
          <span
            aria-hidden
            className={`pointer-events-none absolute top-0 z-0 h-11 rounded-full bg-[#902bf5] shadow-[0_6px_16px_rgba(144,43,245,0.28)] transition-[transform,width,opacity] duration-300 motion-reduce:transition-none ${
              pill.ready ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: pill.w,
              transform: `translate3d(${pill.x}px, 0, 0)`,
              transitionTimingFunction: PILL_EASE,
            }}
          />

          {navItems.map(({ href, label, Icon }, index) => {
            const isActive = index === activeIndex;

            return (
              <div
                key={href}
                className="relative z-10 flex min-w-0 flex-1 justify-center"
              >
                <Link
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  href={href}
                  prefetch
                  tabIndex={showBar ? undefined : -1}
                  onClick={() => {
                    setScrollNavVisible(true);
                    // Snap pill toward this item immediately for instant feedback
                    requestAnimationFrame(() => {
                      const track = trackRef.current;
                      const item = itemRefs.current[index];
                      if (!track || !item) return;
                      const trackRect = track.getBoundingClientRect();
                      const itemRect = item.getBoundingClientRect();
                      setPill({
                        x: itemRect.left - trackRect.left,
                        w: itemRect.width,
                        ready: true,
                      });
                    });
                  }}
                  className={`relative flex h-11 max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 touch-manipulation transition-[color,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                    isActive ? 'text-white' : 'text-neutral-800'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={label}
                >
                  <Icon
                    size={22}
                    strokeWidth={1.7}
                    absoluteStrokeWidth
                    fill={isActive ? 'currentColor' : 'none'}
                    className="h-[22px] w-[22px] max-w-none shrink-0 transition-[fill,color] duration-200 ease-out motion-reduce:transition-none"
                    aria-hidden
                  />
                  <span
                    className={`overflow-hidden whitespace-nowrap text-[13px] font-semibold leading-none tracking-wide transition-[max-width,opacity,transform] duration-300 motion-reduce:transition-none ${
                      isActive
                        ? 'max-w-[5.5rem] translate-x-0 opacity-100'
                        : 'max-w-0 -translate-x-1 opacity-0'
                    }`}
                    style={{ transitionTimingFunction: PILL_EASE }}
                    aria-hidden={!isActive}
                  >
                    {label}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
