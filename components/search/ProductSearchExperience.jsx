'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Container from '../Container';
import SearchSuggestInput from './SearchSuggestInput';
import ProductSearchResults from './ProductSearchResults';
import { lockAppScroll, unlockAppScroll } from '../../lib/pwa/appShell';
import { createAppPortal, ensurePortalRoot } from '../../lib/pwa/safePortal';

const OVERLAY_MS = 200;

/**
 * Single product-search module: one input, in-place activation, existing search API.
 * mode="overlay" — activate on the current page (no route change).
 * mode="page" — full-page body for /search deep links (same bar + results).
 */
export default function ProductSearchExperience({
  initialQuery = '',
  autoFocus = false,
  mode = 'overlay',
  className = '',
  placeholder = 'Search products…',
  onActiveChange,
  onQueryChange,
}) {
  const isPage = mode === 'page';
  const [active, setActive] = useState(Boolean(isPage || autoFocus));
  const [entered, setEntered] = useState(Boolean(isPage || autoFocus));
  const [value, setValue] = useState(() => String(initialQuery || ''));
  const [q, setQ] = useState(() => String(initialQuery || '').trim());
  const [panelTop, setPanelTop] = useState(0);
  const [portalReady, setPortalReady] = useState(false);

  const barWrapRef = useRef(null);
  const resultsPanelRef = useRef(null);
  const inputRef = useRef(null);
  const closeTimerRef = useRef(null);
  const resultsId = useId();

  const setActiveSafe = useCallback(
    (next) => {
      setActive((prev) => {
        const valueNext = Boolean(next);
        if (prev === valueNext) return prev;
        onActiveChange?.(valueNext);
        return valueNext;
      });
    },
    [onActiveChange]
  );

  useEffect(() => {
    ensurePortalRoot();
    setPortalReady(true);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Debounce typing → API query (same cadence as former /search page).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = value.trim();
      setQ((prev) => (prev === next ? prev : next));
    }, 220);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    onQueryChange?.(q);
  }, [q, onQueryChange]);

  // Sync initialQuery if parent changes (e.g. URL on /search).
  useEffect(() => {
    const next = String(initialQuery || '');
    setValue(next);
    setQ(next.trim());
  }, [initialQuery]);

  useEffect(() => {
    if (isPage || autoFocus) {
      onActiveChange?.(true);
    }
    // intentionally once on mount for page/autoFocus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive enter animation after mount so the first paint can start at opacity 0.
  useEffect(() => {
    if (isPage) {
      setEntered(true);
      return undefined;
    }
    if (!active) {
      setEntered(false);
      return undefined;
    }
    setEntered(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [active, isPage]);

  const measurePanelTop = useCallback(() => {
    const el = barWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelTop(Math.max(0, Math.ceil(rect.bottom + 8)));
  }, []);

  useLayoutEffect(() => {
    if (!active || isPage) return undefined;
    measurePanelTop();
    const onResize = () => measurePanelTop();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [active, isPage, measurePanelTop, value]);

  // Lock background scroll while overlay is open; restore on close.
  useEffect(() => {
    if (!active || isPage) return undefined;
    lockAppScroll();
    return () => {
      unlockAppScroll();
    };
  }, [active, isPage]);

  const open = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveSafe(true);
    requestAnimationFrame(() => measurePanelTop());
  }, [measurePanelTop, setActiveSafe]);

  const close = useCallback(() => {
    if (isPage) return;
    if (closeTimerRef.current) return;
    setEntered(false);
    inputRef.current?.blur();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setActiveSafe(false);
    }, OVERLAY_MS);
  }, [isPage, setActiveSafe]);

  useEffect(() => {
    if (!active || isPage) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, isPage, close]);

  // Root-level dismiss: any click outside the search bar / results closes search.
  // Results are portaled to document.body, so they are not under barWrapRef —
  // without excluding resultsPanelRef, ADD / qty clicks would dismiss the overlay.
  // Use click (not pointerdown) so scrolling the results panel does not dismiss.
  // Deferred so the opening click cannot immediately dismiss.
  useEffect(() => {
    if (!active || isPage) return undefined;

    let removeListener = () => {};
    const attachTimer = window.setTimeout(() => {
      const onClick = (event) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (barWrapRef.current?.contains(target)) return;
        if (resultsPanelRef.current?.contains(target)) return;
        close();
      };
      document.addEventListener('click', onClick, true);
      removeListener = () => {
        document.removeEventListener('click', onClick, true);
      };
    }, 0);

    return () => {
      window.clearTimeout(attachTimer);
      removeListener();
    };
  }, [active, isPage, close]);

  const handleSubmitQuery = useCallback(
    (nextQuery) => {
      const next = String(nextQuery || '').trim();
      setValue(next);
      setQ(next);
      open();
    },
    [open]
  );

  const bar = (
    <div ref={barWrapRef} className={className}>
      <SearchSuggestInput
        value={value}
        onValueChange={(next) => {
          setValue(next);
          open();
        }}
        onSubmitQuery={handleSubmitQuery}
        onFocus={open}
        inputRef={inputRef}
        autoFocus={autoFocus}
        placeholder={placeholder}
        enableSuggestions={false}
        className="w-full"
      />
    </div>
  );

  const results = (
    <div id={resultsId} className="px-4 pb-6 pt-2 md:px-0">
      <ProductSearchResults q={q} />
    </div>
  );

  if (isPage) {
    return (
      <div className="w-full">
        <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur md:px-0">
          <Container>{bar}</Container>
        </div>
        <Container>{results}</Container>
      </div>
    );
  }

  const overlay =
    portalReady && active
      ? createAppPortal(
          <div className="fixed inset-0 z-[70]" role="presentation">
            <button
              type="button"
              className={`absolute inset-0 border-0 bg-black/30 backdrop-blur-[3px] transition-[opacity,backdrop-filter] duration-200 ease-out motion-reduce:transition-none ${
                entered ? 'opacity-100' : 'opacity-0'
              }`}
              aria-label="Close search"
              onClick={close}
            />
            <div
              className={`absolute inset-x-0 bottom-0 z-[1] overflow-y-auto overscroll-contain transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
              style={{ top: panelTop }}
              role="dialog"
              aria-modal="true"
              aria-label="Product search results"
            >
              <div
                ref={resultsPanelRef}
                className="bg-white/95 pb-28 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]"
              >
                <Container>{results}</Container>
              </div>
            </div>
          </div>
        )
      : null;

  return (
    <>
      <div className={active ? 'relative z-[72]' : undefined}>{bar}</div>
      {overlay}
    </>
  );
}
