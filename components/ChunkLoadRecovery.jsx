'use client';

import { useEffect } from 'react';
import {
  clearHardRecoveryMarker,
  didRecentlyHardRecover,
  hardRecoverStorefront,
} from '../lib/pwa/recoverStorefront';

function isChunkLoadError(err) {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || err || '');
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /\/_next\/static\/chunks\//i.test(msg)
  );
}

/**
 * Permanent guard: stale hashed chunks / SW mismatches cause blank or looping errors.
 * On ChunkLoadError, clear SW+caches and hard-reload once. Clears recovery marker when healthy.
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    // App mounted successfully — allow a future recovery window.
    if (!didRecentlyHardRecover()) {
      clearHardRecoveryMarker();
    } else {
      // Successful paint after recovery — drop the marker so next real failure can recover.
      const t = window.setTimeout(() => clearHardRecoveryMarker(), 8_000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return undefined;
    const onError = (event) => {
      const err = event?.error || event;
      if (!isChunkLoadError(err)) return;
      event?.preventDefault?.();
      void hardRecoverStorefront();
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      if (!isChunkLoadError(reason)) return;
      event?.preventDefault?.();
      void hardRecoverStorefront();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
