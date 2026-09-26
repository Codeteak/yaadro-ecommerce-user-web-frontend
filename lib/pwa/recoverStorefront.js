/**
 * One-shot hard recovery for blank / looping storefront crashes.
 * Soft React reset() remounts the same broken root — use this instead.
 */

const RECOVERY_KEY = 'yaadro-storefront-hard-recovery';
const RECOVERY_TTL_MS = 60_000;

function recoveryState() {
  try {
    const raw = sessionStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function markRecoveryAttempted() {
  try {
    sessionStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify({ at: Date.now(), n: (recoveryState()?.n || 0) + 1 })
    );
  } catch {
    /* private mode */
  }
}

/** True if we already hard-recovered within the TTL (avoid infinite reload loops). */
export function didRecentlyHardRecover() {
  const state = recoveryState();
  if (!state?.at) return false;
  return Date.now() - Number(state.at) < RECOVERY_TTL_MS;
}

export function clearHardRecoveryMarker() {
  try {
    sessionStorage.removeItem(RECOVERY_KEY);
  } catch {
    /* ignore */
  }
}

async function unregisterServiceWorkers() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
  } catch {
    /* ignore */
  }
}

async function clearCacheStorage() {
  if (typeof caches === 'undefined') return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
  } catch {
    /* ignore */
  }
}

/**
 * Unregister SW, drop Cache Storage, then hard-navigate once.
 * @param {{ href?: string }} [opts]
 * @returns {Promise<boolean>} false if skipped because we already recovered recently
 */
export async function hardRecoverStorefront(opts = {}) {
  if (typeof window === 'undefined') return false;
  if (didRecentlyHardRecover()) return false;

  markRecoveryAttempted();
  await unregisterServiceWorkers();
  await clearCacheStorage();

  const target = opts.href || `${window.location.pathname}${window.location.search || ''}` || '/';
  const url = new URL(target, window.location.origin);
  url.searchParams.set('_r', String(Date.now()));
  window.location.replace(url.toString());
  return true;
}
