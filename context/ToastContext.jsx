'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useLayoutHeights } from './LayoutHeightsContext';
import { useBottomNavVisibility } from './BottomNavVisibilityContext';

const ToastContext = createContext(null);

const MOBILE_BOTTOM_NAV_FALLBACK_PX = 72;
const GAP_ABOVE_BOTTOM_NAV_PX = 12;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

/** Renders toast stack; mount inside LayoutHeightsProvider. */
export function ToastHost() {
  const ctx = useContext(ToastContext);
  const { bottomNavHeight } = useLayoutHeights();
  const { hideForRoute } = useBottomNavVisibility();

  if (!ctx) return null;

  const { toasts, removeToast } = ctx;
  const liftPx =
    !hideForRoute
      ? Math.max(Number(bottomNavHeight) || 0, MOBILE_BOTTOM_NAV_FALLBACK_PX) +
        GAP_ABOVE_BOTTOM_NAV_PX
      : null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:top-auto md:items-end md:px-6"
      style={{
        bottom:
          liftPx != null
            ? `${liftPx}px`
            : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        transition: 'bottom 300ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
}

function Toast({ toast, removeToast }) {
  const styles = {
    success: 'bg-violet-600 shadow-[0_8px_24px_rgba(144,43,245,0.35)]',
    error: 'bg-red-500 shadow-[0_8px_24px_rgba(239,68,68,0.3)]',
    info: 'bg-slate-700 shadow-[0_8px_24px_rgba(51,65,85,0.25)]',
    warning: 'bg-amber-500 shadow-[0_8px_24px_rgba(245,158,11,0.3)]',
  };
  const bgColor = styles[toast.type] ?? 'bg-gray-700';

  const icon = {
    success: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  }[toast.type] ?? null;

  return (
    <div
      className={`${bgColor} pointer-events-auto flex w-full max-w-xs items-center gap-2 rounded-2xl border border-white/15 px-4 py-2.5 text-white backdrop-blur-sm animate-slide-up md:max-w-sm`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <p className="flex-1 truncate text-xs font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/20"
        aria-label="Dismiss notification"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
