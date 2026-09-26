const RELOAD_GUARD_KEY = 'yaadro-sw-reload';
const RELOAD_AT_KEY = 'yaadro-sw-reload-at';
/** Never SW-reload more than once per this window (prevents deploy update loops). */
const RELOAD_COOLDOWN_MS = 45_000;

function canReloadForSwUpdate() {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') return false;
    const at = Number(sessionStorage.getItem(RELOAD_AT_KEY) || 0);
    if (at && Date.now() - at < RELOAD_COOLDOWN_MS) return false;
    return true;
  } catch {
    return true;
  }
}

function markSwReload() {
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'production') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    // After SKIP_WAITING + claim, reload once so the new SW controls this tab.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      if (!canReloadForSwUpdate()) return;
      markSwReload();
      refreshing = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    // Activate updated SW promptly on next load (mobile + desktop installs).
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          // Only skip-waiting if we are allowed to reload; otherwise wait for next visit.
          if (!canReloadForSwUpdate()) return;
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    if (registration.waiting && canReloadForSwUpdate()) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Clear one-shot guard once this page is controlled by a stable SW.
    if (navigator.serviceWorker.controller) {
      try {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
      } catch {
        /* ignore */
      }
    }

    return registration;
  } catch (error) {
    console.warn('Service worker registration failed:', error);
    return null;
  }
}
