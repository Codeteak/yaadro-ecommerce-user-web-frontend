/**
 * Stable portal host for overlays (cart pill, search, sheets).
 *
 * Holding a stale `#app-shell` reference after ClientOnly/HMR remounts causes:
 *   Cannot read properties of null (reading 'removeChild')
 * when React tries to unmount the portal from a disconnected node.
 *
 * We keep one dedicated element and re-parent it when the shell remounts so the
 * portal container identity stays connected.
 */

import { createPortal } from 'react-dom';
import { getAppShellEl } from './appShell.js';

export const PORTAL_ROOT_ID = 'yaadro-portal-root';

/**
 * @returns {HTMLElement | null}
 */
export function ensurePortalRoot() {
  if (typeof document === 'undefined') return null;

  let el = document.getElementById(PORTAL_ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = PORTAL_ROOT_ID;
    el.setAttribute('data-yaadro-portal-root', '');
    // Zero-size host: fixed/absolute children paint normally; must not cover the shell
    // (a full-bleed absolute layer would steal all clicks under the overlays).
    el.style.cssText = '';
  }

  const shell = getAppShellEl();
  const parent = shell?.isConnected ? shell : document.body;
  if (!parent?.isConnected) return null;

  if (el.parentNode !== parent) {
    try {
      parent.appendChild(el);
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
  if (!host) return null;
  return createPortal(children, host);
}
