'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Wait before showing — avoids flicker on fast navigations. */
const SHOW_AFTER_MS = 140;
/** Keep bar visible briefly so it can finish animating. */
const MIN_VISIBLE_MS = 220;
const COMPLETE_FADE_MS = 180;

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname || ''}?${searchParams?.toString?.() || ''}`;

  const [painted, setPainted] = useState(false);
  const [filling, setFilling] = useState(false);
  const navigatingRef = useRef(false);
  const showTimerRef = useRef(null);
  const completeTimerRef = useRef(null);
  const startedAtRef = useRef(0);
  const routeKeyRef = useRef(routeKey);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (!navigatingRef.current) return;
    navigatingRef.current = false;
    clearTimers();

    const elapsed = Date.now() - startedAtRef.current;
    const hold = Math.max(0, MIN_VISIBLE_MS - elapsed);

    completeTimerRef.current = setTimeout(() => {
      setFilling(false);
      completeTimerRef.current = setTimeout(() => {
        setPainted(false);
        completeTimerRef.current = null;
      }, COMPLETE_FADE_MS);
    }, hold);
  }, [clearTimers]);

  const begin = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    startedAtRef.current = Date.now();
    clearTimers();

    showTimerRef.current = setTimeout(() => {
      if (!navigatingRef.current) return;
      setPainted(true);
      // Next frame so CSS width transition runs from 0 → progress.
      requestAnimationFrame(() => {
        if (!navigatingRef.current) return;
        setFilling(true);
      });
    }, SHOW_AFTER_MS);
  }, [clearTimers]);

  // Route settled → complete progress.
  useEffect(() => {
    if (routeKeyRef.current === routeKey) return;
    routeKeyRef.current = routeKey;
    finish();
  }, [routeKey, finish]);

  // Capture same-origin Link / <a> navigations (footer + header + in-page).
  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.button != null && event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      let next;
      try {
        next = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;

      const current = `${window.location.pathname}${window.location.search}`;
      const destination = `${next.pathname}${next.search}`;
      if (current === destination) return;

      begin();
    };

    document.addEventListener('click', onPointerDown, true);
    return () => document.removeEventListener('click', onPointerDown, true);
  }, [begin]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!painted) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden"
      role="progressbar"
      aria-hidden={!filling}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={filling ? 80 : 0}
    >
      <div
        className={`h-full origin-left bg-[#902bf5] shadow-[0_0_8px_rgba(144,43,245,0.55)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none ${
          filling ? 'w-[82%] opacity-100' : 'w-0 opacity-0'
        }`}
      />
      {filling ? (
        <div className="absolute inset-y-0 right-0 w-24 translate-x-0 animate-navigation-progress-shine bg-gradient-to-r from-transparent via-white/50 to-transparent motion-reduce:animate-none" />
      ) : null}
    </div>
  );
}

/**
 * One global App Router navigation indicator.
 * Shows only when navigation takes longer than SHOW_AFTER_MS.
 */
export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
