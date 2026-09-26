'use client';

import { useEffect, useRef } from 'react';
import {
  clearHardRecoveryMarker,
  didRecentlyHardRecover,
  hardRecoverStorefront,
} from '../lib/pwa/recoverStorefront';

/**
 * Route-level recovery — hard reload instead of soft reset() loops.
 */
export default function Error({ error, reset: _reset }) {
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    if (process.env.NODE_ENV !== 'production') return;
    if (didRecentlyHardRecover()) return;
    void hardRecoverStorefront();
  }, []);

  const onRecover = () => {
    void hardRecoverStorefront().then((did) => {
      if (!did) {
        clearHardRecoveryMarker();
        window.location.reload();
      }
    });
  };

  const message = error?.message || error?.digest || '';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        This page hit an unexpected error. Reload clears cached files and tries again.
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
          className="rounded-full bg-[#902bf5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7d24d6]"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => {
            clearHardRecoveryMarker();
            window.location.href = '/';
          }}
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Home
        </button>
      </div>
    </div>
  );
}
