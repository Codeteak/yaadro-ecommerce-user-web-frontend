export async function registerServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'production') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
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

    return registration;
  } catch (error) {
    console.warn('Service worker registration failed:', error);
    return null;
  }
}
