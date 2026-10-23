"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const THRESHOLD = 64;
const MAX_PULL = 96;

export type PullToRefreshHandle = {
  /** Runs the same path as releasing past the pull threshold (playground / tests). */
  triggerRefresh: () => Promise<void>;
};

type PullToRefreshProps = {
  children: ReactNode;
  /** Called when the user releases past the threshold. Default: ~800ms UI delay. */
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

async function defaultRefresh() {
  await new Promise((r) => setTimeout(r, 800));
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Pull-to-refresh for storefront content regions. Chrome above this
 * wrapper (hero, category rail, PageHeader, etc.) stays fixed; the
 * spinner gap opens above children. Touch is listened on window so a
 * pull starting on the hero still works while the indicator stays here.
 * UI-only until APIs plug into onRefresh.
 */
export const PullToRefresh = forwardRef<PullToRefreshHandle, PullToRefreshProps>(
  function PullToRefresh(
    { children, onRefresh = defaultRefresh, disabled = false, className },
    ref,
  ) {
    const [pull, setPull] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [dragging, setDragging] = useState(false);
    const reduceMotion = useSyncExternalStore(
      subscribeReducedMotion,
      getReducedMotion,
      () => false,
    );

    const startY = useRef(0);
    const startX = useRef(0);
    const pulling = useRef(false);
    const armed = useRef(false);
    const pullRef = useRef(0);
    const refreshingRef = useRef(false);
    const reduceMotionRef = useRef(reduceMotion);
    const disabledRef = useRef(disabled);
    const onRefreshRef = useRef(onRefresh);

    useEffect(() => {
      disabledRef.current = disabled;
      onRefreshRef.current = onRefresh;
      reduceMotionRef.current = reduceMotion;
    }, [disabled, onRefresh, reduceMotion]);

    const setPullBoth = useCallback((value: number) => {
      pullRef.current = value;
      setPull(value);
    }, []);

    const finishRefresh = useCallback(async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      setDragging(false);
      setPullBoth(THRESHOLD);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        setPullBoth(0);
      }
    }, [setPullBoth]);

    useImperativeHandle(
      ref,
      () => ({
        triggerRefresh: () => finishRefresh(),
      }),
      [finishRefresh],
    );

    useEffect(() => {
      const onTouchStart = (e: TouchEvent) => {
        if (disabledRef.current || refreshingRef.current) return;
        if (window.scrollY > 0) {
          armed.current = false;
          return;
        }
        const t = e.touches[0];
        startY.current = t.clientY;
        startX.current = t.clientX;
        armed.current = true;
        pulling.current = false;
      };

      const onTouchMove = (e: TouchEvent) => {
        if (disabledRef.current || !armed.current || refreshingRef.current) {
          return;
        }
        if (window.scrollY > 0) {
          armed.current = false;
          pulling.current = false;
          setDragging(false);
          setPullBoth(0);
          return;
        }

        const t = e.touches[0];
        const dy = t.clientY - startY.current;
        const dx = t.clientX - startX.current;

        if (!pulling.current) {
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
            armed.current = false;
            return;
          }
          if (dy < 8) return;
          pulling.current = true;
          setDragging(true);
        }

        if (dy <= 0) {
          setPullBoth(0);
          return;
        }

        const resisted = Math.min(MAX_PULL, dy * 0.45);
        setPullBoth(resisted);

        if (!reduceMotionRef.current && e.cancelable) {
          e.preventDefault();
        }
      };

      const onTouchEnd = () => {
        if (disabledRef.current || !armed.current) return;
        armed.current = false;
        pulling.current = false;
        setDragging(false);
        if (refreshingRef.current) return;

        if (pullRef.current >= THRESHOLD) {
          void finishRefresh();
        } else {
          setPullBoth(0);
        }
      };

      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd);
      window.addEventListener("touchcancel", onTouchEnd);
      return () => {
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("touchcancel", onTouchEnd);
      };
    }, [finishRefresh, setPullBoth]);

    const showSpinner = refreshing || pull > 8;
    const spinnerHeight = refreshing
      ? THRESHOLD
      : reduceMotion
        ? 0
        : pull;
    const spinnerOpacity = refreshing ? 1 : Math.min(1, pull / THRESHOLD);
    const spinning = refreshing || pull >= THRESHOLD;

    return (
      <div className={className}>
        <div
          className="pointer-events-none flex items-end justify-center overflow-hidden"
          style={{
            height: spinnerHeight,
            opacity: showSpinner ? spinnerOpacity : 0,
            transition: dragging
              ? "none"
              : "height 0.25s ease, opacity 0.2s ease",
          }}
          aria-hidden={!refreshing}
        >
          <div
            className={`mb-2 size-6 rounded-full border-2 border-leaf/25 border-t-leaf ${
              spinning ? "ptr-spin" : ""
            }`}
          />
        </div>

        {children}

        <span className="sr-only" aria-live="polite">
          {refreshing ? "Refreshing" : ""}
        </span>
      </div>
    );
  },
);
