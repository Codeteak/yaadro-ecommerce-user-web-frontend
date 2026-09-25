/** Root-level signal so button `router.push` navigations show the global progress bar. */

export const NAVIGATION_BEGIN_EVENT = 'yaadro:navigation-begin';

/**
 * Call right before `router.push` / `router.replace` from non-`<a>` controls
 * (profile icon, login redirects, etc.) so users get instant loading feedback.
 */
export function signalNavigationBegin() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NAVIGATION_BEGIN_EVENT));
}

export function subscribeNavigationBegin(handler) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(NAVIGATION_BEGIN_EVENT, handler);
  return () => window.removeEventListener(NAVIGATION_BEGIN_EVENT, handler);
}
