/**
 * Stable portal host for overlays (cart pill, search, sheets).
 *
 * History: mounting into `#app-shell` and re-parenting on remount caused:
 *   TypeError: Cannot read properties of null (reading 'removeChild')
 * when React committed an unmount against a portal container that had been
 * moved/detached mid-tree.
 *
 * Rulee: one host, always on `document.body`, never moved after first attach.
 */

import { createPortal } from 'react-dom';

export const PORTAL_ROOT_ID = 'yaadro-portal-root';

/**
 * @returns {HTMLElement | null}
 */
export function ensurePortalRoot() {
  if (typeof document === 'undefined') return null;
  if (!document.body) return null;

  let el = document.getElementById(PORTAL_ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = PORTAL_ROOT_ID;
    el.setAttribute('data-yaadro-portal-root', '');
    // Zero-size host: fixed/absolute children paint normally.
    el.style.cssText = '';
  }

  // Never re-parent once attached — moving the node while React owns portal
  // children triggers removeChild on a null parent.
  if (!el.isConnected) {
    try {
      document.body.appendChild(el);
    } catch {
      return null;
    }
  }

  return el.isConnected ? el : null;
}

/**
 * Prefer a live preferred host; otherwise the stable portal root.
 * @param {Element | null | undefined} preferred
 * @returns {Element | null}
 */
export function resolvePortalHost(preferred) {
  if (preferred && preferred.isConnected) return preferred;
  return ensurePortalRoot();
}

/**
 * Safe createPortal — never targets a disconnected node.
 * @param {import('react').ReactNode} children
 * @param {Element | null | undefined} [preferredHost]
 * @returns {import('react').ReactPortal | null}
 */
export function createAppPortal(children, preferredHost) {
  const host = resolvePortalHost(preferredHost);
  if (!host?.isConnected) return null;
  return createPortal(children, host);
}
