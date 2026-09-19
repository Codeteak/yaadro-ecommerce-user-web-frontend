const RELOAD_GUARD_KEY = 'yaadro-sw-reload';

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'production') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    // After SKIP_WAITING + claim, reload once so the new SW controls this tab.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      } catch {
        /* private mode */
      }
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
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Clear reload guard once this page is controlled by a stable SW.
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
