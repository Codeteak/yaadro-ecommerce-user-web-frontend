import { signalNavigationBegin } from './navigationProgressSignal';

const STORAGE_KEY = 'yaadro:product-nav-v1';

/** True for PDP routes (`/products/[slug]`, `/products/detail`), not `/products` listing. */
export function isProductDetailPath(pathname) {
  if (!pathname) return false;
  const path = String(pathname).replace(/\/+$/, '') || '/';
  if (path === '/products') return false;
  return path.startsWith('/products/');
}

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(next) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

function currentLocationKey() {
  return `${window.location.pathname}${window.location.search || ''}`;
}

/**
 * Open a product detail URL while keeping ~2 history slots: origin + current PDP.
 * - First open from a list/home: push
 * - Product → product (packs, related, another card on PDP): replace
 * - Re-open from the same origin after in-app Back: replace (avoids /, A, /, B loops)
 */
export function navigateToProductDetail(router, href) {
  if (!href || typeof href !== 'string') return;
  const target = href.trim();
  if (!target || target === '/products/' || target === '/products') return;

  signalNavigationBegin();

  if (typeof window === 'undefined') {
    router.push(target);
    return;
  }

  if (isProductDetailPath(window.location.pathname)) {
    const session = readSession();
    writeSession({
      originPath: session?.originPath || '/',
      href: target,
      active: true,
      justReturned: false,
    });
    router.replace(target);
    return;
  }

  const here = currentLocationKey();
  const session = readSession();

  // After in-app PDP Back we replaced the PDP with the origin — open the next
  // product with replace so history stays origin + one PDP.
  if (session?.active && session.justReturned && session.originPath === here) {
    writeSession({
      originPath: here,
      href: target,
      active: true,
      justReturned: false,
    });
    router.replace(target);
    return;
  }

  writeSession({
    originPath: here,
    href: target,
    active: true,
    justReturned: false,
  });
  router.push(target);
}

/**
 * Leave PDP in one step back to the stored origin (not through every viewed SKU).
 */
export function backFromProductDetail(router, fallbackHref = '/') {
  signalNavigationBegin();

  if (typeof window === 'undefined') {
    router.replace(fallbackHref);
    return;
  }

  const session = readSession();
  const origin =
    (session?.originPath && String(session.originPath).trim()) || fallbackHref || '/';

  writeSession({
    originPath: origin,
    href: null,
    active: true,
    justReturned: true,
  });
  router.replace(origin);
}
