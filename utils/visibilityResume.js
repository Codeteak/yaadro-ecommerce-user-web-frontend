/**
 * Coalesce tab-resume refetches (visibility + bfcache pageshow).
 * Avoids invalidate→refetch storms when users briefly switch apps.
 *
 * @param {() => void} onResume
 * @param {{ cooldownMs?: number }} [options]
 * @returns {() => void} cleanup
 */
export function attachVisibilityResume(onResume, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const cooldownMs =
    Number.isFinite(options.cooldownMs) && options.cooldownMs >= 0
      ? options.cooldownMs
      : 60_000;

  let lastAt = 0;

  const run = () => {
    const now = Date.now();
    if (now - lastAt < cooldownMs) return;
    lastAt = now;
    onResume();
  };

  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    run();
  };

  const onPageShow = (event) => {
    if (event?.persisted) run();
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
  };
}
