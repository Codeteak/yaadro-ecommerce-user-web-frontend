'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { History, House, LayoutGrid, ShoppingBag } from 'lucide-react';
import { useBottomNavVisibility } from '../context/BottomNavVisibilityContext';
import { useLayoutHeights } from '../context/LayoutHeightsContext';

const PILL_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };
const ICON_SPRING = { type: 'spring', stiffness: 520, damping: 32, mass: 0.65 };
const TAP_SPRING = { type: 'spring', stiffness: 540, damping: 34 };
const LABEL_TRANSITION = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

function SmoothNavIcon({ Icon, active, reduceMotion }) {
  const spring = reduceMotion ? { duration: 0 } : ICON_SPRING;

  return (
    <span className="relative inline-flex h-[22px] w-[22px] max-w-none shrink-0 items-center justify-center">
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{ opacity: active ? 0 : 1, scale: active ? 0.78 : 1 }}
        transition={spring}
      >
        <Icon
          size={22}
          strokeWidth={1.7}
          absoluteStrokeWidth
          fill="none"
          className="max-w-none"
          aria-hidden
        />
      </motion.span>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={false}
        animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.78 }}
        transition={spring}
      >
        <Icon
          size={22}
          strokeWidth={1.7}
          absoluteStrokeWidth
          fill="currentColor"
          className="max-w-none"
          aria-hidden
        />
      </motion.span>
    </span>
  );
}

const navItems = [
  { href: '/', label: 'Home', Icon: House },
  { href: '/categories', label: 'Categories', Icon: LayoutGrid },
  { href: '/products', label: 'Products', Icon: ShoppingBag },
  { href: '/orders', label: 'Reorder', Icon: History },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { hideForRoute } = useBottomNavVisibility();
  const { setBottomNavHeight } = useLayoutHeights();
  const navRef = useRef(null);
  const reduceMotion = useReducedMotion();

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

  const spring = reduceMotion ? { duration: 0 } : PILL_SPRING;
  const labelSpring = reduceMotion ? { duration: 0 } : LABEL_TRANSITION;

  return (
    <div
      ref={navRef}
      className="mobile-bottom-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 w-full min-w-0 overflow-x-clip"
    >
      <nav
        className="pointer-events-auto w-full min-w-0 overflow-hidden rounded-t-[24px] border-t border-black/[0.06] bg-white px-1.5 pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
        style={{
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
        aria-label="Primary"
      >
        <LayoutGroup id="mobile-bottom-nav">
          <div className="mobile-bottom-nav-track flex w-full min-w-0 items-center">
            {navItems.map(({ href, label, Icon }) => {
              const isActive =
                pathname === href || (href !== '/' && pathname?.startsWith(href));

              return (
                <motion.div
                  key={href}
                  className={`flex min-w-0 justify-center ${isActive ? 'shrink-0' : 'flex-1'}`}
                  whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                  transition={TAP_SPRING}
                >
                  <Link
                    href={href}
                    prefetch
                    className={`relative flex max-w-full items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                      isActive
                        ? 'h-11 gap-1.5 px-3 text-white'
                        : 'h-11 w-11 text-neutral-800'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={label}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="mobile-tab-pill"
                        className="absolute inset-0 rounded-full bg-[#902bf5]"
                        transition={spring}
                        initial={false}
                      />
                    ) : null}
                    <span className="relative z-10 flex min-w-0 items-center gap-1.5">
                      <SmoothNavIcon Icon={Icon} active={isActive} reduceMotion={reduceMotion} />
                      <AnimatePresence initial={false}>
                        {isActive ? (
                          <motion.span
                            key={label}
                            initial={reduceMotion ? false : { width: 0, opacity: 0 }}
                            animate={{ width: 'auto', opacity: 1 }}
                            exit={reduceMotion ? undefined : { width: 0, opacity: 0 }}
                            transition={labelSpring}
                            className="overflow-hidden whitespace-nowrap text-[13px] font-semibold leading-none tracking-wide"
                          >
                            {label}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>
      </nav>
    </div>
  );
}
