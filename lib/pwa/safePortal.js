/**
 * Stable portal host for overlays (cart pill, search, sheets).
 *
 * NEVER mount this under `#app-shell`. That node is React-owned; a foreign sibling
 * there corrupts commit/unmount and throws:
 *   Cannot read properties of null (reading 'removeChild')
 *
 * Host lives as a React-owned empty sibling of `#app-shell` in `app/layout.js`
 * (or a body fallback). Portals target that host only — do not re-parent into the shell.
 */

import { createPortal } from 'react-dom';
import { APP_SHELL_ID, getAppShellEl } from './appShell.js';

export const PORTAL_ROOT_ID = 'yaadro-portal-root';

function isUnsafePortalHost(node) {
  if (!node || typeof node !== 'object') return true;
  if (node.id === APP_SHELL_ID) return true;
  const shell = getAppShellEl();
  // Anything React still reconciles under the shell (except the portal root itself).
  if (shell && node !== shell && shell.contains(node) && node.id !== PORTAL_ROOT_ID) {
    return true;
  }
  return false;
}

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

  const body = document.body;
  if (!body?.isConnected) return null;

  // Migrate any legacy host that was appended under #app-shell (causes removeChild crashes).
  const shell = getAppShellEl();
  const underShell = Boolean(shell && shell.contains(el));
  if (!el.parentNode || underShell) {
    try {
      if (el.parentNode !== body) body.appendChild(el);
    } catch {
      return null;
    }
  }

  return el.isConnected ? el : null;
}

/**
 * Prefer a live preferred host outside `#app-shell`; otherwise the stable portal root.
 * @param {Element | null | undefined} preferred
 * @returns {Element | null}
 */
export function resolvePortalHost(preferred) {
  if (preferred && preferred.isConnected && !isUnsafePortalHost(preferred)) {
    return preferred;
  }
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
