'use client';

import { useEffect, useRef } from 'react';
import {
  clearHardRecoveryMarker,
  didRecentlyHardRecover,
  hardRecoverStorefront,
} from '../lib/pwa/recoverStorefront';

/**
 * Root recovery when the app tree crashes (layout/providers).
 * Soft reset() remounts the same broken tree and loops — always hard-recover.
 * Must include its own html/body — replaces the root layout.
 */
export default function GlobalError({ error, reset: _reset }) {
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    // Soft reset loops in production when SW/chunks are stale — auto hard-recover once.
    // In local dev, auto-reload fights HMR / multi-port chaos; keep buttons manual only.
    if (process.env.NODE_ENV !== 'production') return;
    if (didRecentlyHardRecover()) return;
    void hardRecoverStorefront({ href: '/' });
  }, []);

  const onRecover = () => {
    void hardRecoverStorefront({ href: '/' }).then((did) => {
      if (!did) {
        // Already tried — force a plain navigation without another recovery stamp race.
        clearHardRecoveryMarker();
        window.location.href = '/';
      }
    });
  };

  const message =
    error?.message ||
    (typeof error === 'string' ? error : '') ||
    error?.digest ||
    '';

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-500">
            Recovering the storefront. If this keeps showing, tap Reload — that clears
            cached app files and opens home fresh.
          </p>
          {message ? (
            <p className="mt-3 max-w-md break-words text-left text-xs text-red-600/90">
              {String(message)}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRecover}
              className="rounded-full bg-[#902bf5] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => {
                clearHardRecoveryMarker();
                window.location.href = '/';
              }}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-800"
            >
              Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
