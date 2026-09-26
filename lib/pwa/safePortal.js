/**
 * Stable portal host for overlays (cart pill, search, sheets, Radix dialogs).
 *
 * History: mounting into `#app-shell` and re-parenting on remount caused:
 *   TypeError: Cannot read properties of null (reading 'removeChild')
 * when React committed an unmount against a portal container that had been
 * moved/detached mid-tree.
 *
 * Rule: one host, always on `document.body`, never moved after first attach.
 * Never portal into `#app-shell` — ClientOnly remounts race with portal unmount.
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
 * Container for Radix Dialog/Popover Portal `container` prop.
 * Falls back to document.body if portal root cannot be created.
 * @returns {HTMLElement | null}
 */
export function getStablePortalContainer() {
  return ensurePortalRoot() || (typeof document !== 'undefined' ? document.body : null);
}

/**
 * Prefer a live preferred host only when it is the stable body portal root.
 * Any other preferred host (e.g. `#app-shell`) is ignored — that path caused
 * removeChild null crashes.
 * @param {Element | null | undefined} preferred
 * @returns {Element | null}
 */
export function resolvePortalHost(preferred) {
  const root = ensurePortalRoot();
  if (preferred && preferred.isConnected && root && preferred === root) {
    return preferred;
  }
  if (preferred && preferred.isConnected && preferred === document.body) {
    return preferred;
  }
  return root;
}

/**
 * Safe createPortal — always targets the stable body-mounted host.
 * @param {import('react').ReactNode} children
 * @param {Element | null | undefined} [_preferredHost] ignored (API compat)
 * @returns {import('react').ReactPortal | null}
 */
export function createAppPortal(children, _preferredHost) {
  const host = ensurePortalRoot();
  if (!host?.isConnected) return null;
  return createPortal(children, host);
}
