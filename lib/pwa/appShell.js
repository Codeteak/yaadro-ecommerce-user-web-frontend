export const APP_SHELL_ID = 'app-shell';
export const APP_SCROLL_ID = 'app-scroll';

/** Ref-counted scroll lock so overlays don't leave html/body/#app-scroll stuck. */
let appScrollLockCount = 0;
let lockedScrollY = 0;
let prevBodyOverflow = '';

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

/**
 * Lock the real scroll owner (document on mobile, `#app-scroll` on desktop).
 * Uses `html.app-scroll-locked` for the desktop scroller (see globals.css) and
 * `body.style.overflow = hidden` for document scroll. Ref-counted — pair every
 * lock with unlock. Does NOT write inline overflow on `#app-scroll` or `html`
 * (those left permanent freezes when cleanup raced).
 */
export function lockAppScroll() {
  if (typeof document === 'undefined') return;
  if (appScrollLockCount === 0) {
    lockedScrollY = getAppScrollY();
    prevBodyOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('app-scroll-locked');
  }
  appScrollLockCount += 1;
}

export function unlockAppScroll() {
  if (typeof document === 'undefined') return;
  if (appScrollLockCount <= 0) return;
  appScrollLockCount -= 1;
  if (appScrollLockCount > 0) return;

  document.documentElement.classList.remove('app-scroll-locked');
  // Clear any leftover inline overflow from pre-refcount lockers.
  if (document.documentElement.style.overflow === 'hidden') {
    document.documentElement.style.overflow = '';
  }
  const scroller = getAppScrollEl();
  if (scroller?.style?.overflow === 'hidden') {
    scroller.style.overflow = '';
  }
  document.body.style.overflow = prevBodyOverflow;
  prevBodyOverflow = '';
  setAppScrollY(lockedScrollY);
}

/** @returns {number} active lock holders (0 = unlocked) */
export function getAppScrollLockCount() {
  return appScrollLockCount;
}

/** Test helper — do not use in product UI. */
export function __resetAppScrollLockForTests() {
  appScrollLockCount = 0;
  lockedScrollY = 0;
  prevBodyOverflow = '';
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('app-scroll-locked');
    if (document.body) document.body.style.overflow = '';
  }
}

/**
 * Keep `app-scroll-locked` in sync with body overflow for any leftover
 * ad-hoc lockers. Prefer lockAppScroll/unlockAppScroll for new code.
 */
export function syncAppScrollLockFromBody() {
  if (typeof document === 'undefined') return;
  const overflow = document.body?.style?.overflow || '';
  const locked = appScrollLockCount > 0 || overflow === 'hidden';
  document.documentElement.classList.toggle('app-scroll-locked', locked);
}
