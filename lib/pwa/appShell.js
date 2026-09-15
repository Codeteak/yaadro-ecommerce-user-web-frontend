export const APP_SHELL_ID = 'app-shell';
export const APP_SCROLL_ID = 'app-scroll';

export function getAppShellEl() {
  if (typeof document === 'undefined') return null;
  return document.getElementById(APP_SHELL_ID);
}

export function getAppScrollEl() {
  if (typeof document === 'undefined') return null;
  return document.getElementById(APP_SCROLL_ID);
}

function isScrollContainer(el) {
  if (!el || typeof window === 'undefined') return false;
  const overflowY = window.getComputedStyle(el).overflowY;
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
}

export function getAppScrollY() {
  if (typeof window === 'undefined') return 0;
  const scroller = getAppScrollEl();
  if (isScrollContainer(scroller)) return scroller.scrollTop || 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function setAppScrollY(y) {
  if (typeof window === 'undefined') return;
  const next = Number(y) || 0;
  const scroller = getAppScrollEl();
  if (isScrollContainer(scroller)) {
    scroller.scrollTop = next;
    return;
  }
  window.scrollTo(0, next);
}

export function subscribeAppScroll(handler, options = { passive: true }) {
  if (typeof window === 'undefined') return () => {};
  const scroller = getAppScrollEl();
  window.addEventListener('scroll', handler, options);
  scroller?.addEventListener('scroll', handler, options);
  return () => {
    window.removeEventListener('scroll', handler, options);
    scroller?.removeEventListener('scroll', handler, options);
  };
}

export function syncAppScrollLockFromBody() {
  if (typeof document === 'undefined') return;
  const overflow = document.body?.style?.overflow || '';
  const locked = overflow === 'hidden';
  document.documentElement.classList.toggle('app-scroll-locked', locked);
}
