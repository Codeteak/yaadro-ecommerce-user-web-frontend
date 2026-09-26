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

/** DOM commit crashes (stale SW / portal host detach) — recover once like chunk errors. */
function isDomHydrationCorruption(err) {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || err || '');
  return (
    name === 'NotFoundError' ||
    /Failed to execute 'removeChild' on 'Node'/i.test(msg) ||
    /Cannot read properties of null \(reading 'removeChild'\)/i.test(msg) ||
    /The node to be removed is not a child of this node/i.test(msg)
  );
}

function shouldHardRecover(err) {
  return isChunkLoadError(err) || isDomHydrationCorruption(err);
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
      if (!shouldHardRecover(err)) return;
      event?.preventDefault?.();
      void hardRecoverStorefront();
    };
    const onRejection = (event) => {
      const reason = event?.reason;
      if (!shouldHardRecover(reason)) return;
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
