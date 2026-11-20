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
/** Finger must move this far down before we claim the gesture (Mac DevTools touch is noisy). */
const PULL_COMMIT_PX = 14;
/** Once committed, only then block native scroll. */
const PREVENT_DEFAULT_PX = 20;

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

function canScrollY(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") {
    return false;
  }
  return el.scrollHeight > el.clientHeight + 1;
}

/**
 * Nearest vertical scrollport for this PTR tree, else the document.
 * Do not treat a growing (non-overflow) wrapper as a scroller — that made
 * scrollTop always 0 and PTR steal gestures from window scroll (home).
 */
function resolveScrollPort(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  if (canScrollY(root)) return root;
  let el: HTMLElement | null = root.parentElement;
  while (el && el !== document.documentElement) {
    if (canScrollY(el)) return el;
    el = el.parentElement;
  }
  const doc = document.scrollingElement;
  if (doc instanceof HTMLElement && doc.scrollHeight > doc.clientHeight + 1) {
    return doc;
  }
  return null;
}

function readScrollTop(port: HTMLElement | null): number {
  if (port) return port.scrollTop;
  return window.scrollY;
}

/**
 * Pull-to-refresh for storefront content regions. Chrome above this
 * wrapper (hero, category rail, PageHeader, etc.) stays fixed; the
 * spinner gap opens above children. Touch is listened on window so a
 * pull starting on the hero still works while the indicator stays here.
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

    const rootRef = useRef<HTMLDivElement>(null);
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

    const resetGesture = useCallback(() => {
      armed.current = false;
      pulling.current = false;
      setDragging(false);
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
        const root = rootRef.current;
        if (!root || !(e.target instanceof Node) || !root.contains(e.target)) {
          resetGesture();
          return;
        }
        if (readScrollTop(resolveScrollPort(root)) > 0) {
          resetGesture();
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

        const root = rootRef.current;
        if (readScrollTop(resolveScrollPort(root)) > 0) {
          resetGesture();
          setPullBoth(0);
          return;
        }

        const t = e.touches[0];
        const dy = t.clientY - startY.current;
        const dx = t.clientX - startX.current;

        // User is scrolling content (finger up) — never claim the gesture.
        if (dy < -8) {
          resetGesture();
          setPullBoth(0);
          return;
        }

        if (!pulling.current) {
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
            resetGesture();
            return;
          }
          if (dy < PULL_COMMIT_PX) return;
          pulling.current = true;
          setDragging(true);
        }

        if (dy <= 0) {
          setPullBoth(0);
          return;
        }

        const resisted = Math.min(MAX_PULL, dy * 0.45);
        setPullBoth(resisted);

        // Only block native scroll after a clear pull — avoids SE/DevTools
        // trackpad-as-touch getting stuck with preventDefault too early.
        if (
          !reduceMotionRef.current &&
          e.cancelable &&
          resisted >= PREVENT_DEFAULT_PX * 0.45
        ) {
          e.preventDefault();
        }
      };

      const onTouchEnd = () => {
        const wasArmed = armed.current;
        const pullAmount = pullRef.current;
        resetGesture();
        if (disabledRef.current || !wasArmed) {
          if (!refreshingRef.current) setPullBoth(0);
          return;
        }
        if (refreshingRef.current) return;

        if (pullAmount >= THRESHOLD) {
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
    }, [finishRefresh, resetGesture, setPullBoth]);

    const showSpinner = refreshing || pull > 8;
    const spinnerHeight = refreshing
      ? THRESHOLD
      : reduceMotion
        ? 0
        : pull;
    const spinnerOpacity = refreshing ? 1 : Math.min(1, pull / THRESHOLD);
    const spinning = refreshing || pull >= THRESHOLD;

    return (
      <div ref={rootRef} className={className}>
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
