/**
 * Stable portal host for overlays (search, sheets, tracking).
 *
 * NEVER mount this under `#app-shell`. That node is React-owned; a foreign sibling
 * there corrupts commit/unmount and throws:
 *   Cannot read properties of null (reading 'removeChild')
 *
 * Host lives as a React-owned empty sibling of `#app-shell` in `app/layout.js`
 * (or a body fallback). Do not re-parent a connected body-level host — moving a
 * React-owned node mid-commit causes the same removeChild crash.
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

  const body = document.body;
  if (!body?.isConnected) return null;

  let el = document.getElementById(PORTAL_ROOT_ID);
  if (el) {
    const shell = getAppShellEl();
    // Only migrate a legacy host still trapped under #app-shell.
    // Never move a connected body-level host — layout owns that node.
    if (shell && shell.contains(el)) {
      try {
        body.appendChild(el);
      } catch {
        return el.isConnected ? el : null;
      }
    }
    return el.isConnected ? el : null;
  }

  el = document.createElement('div');
  el.id = PORTAL_ROOT_ID;
  el.setAttribute('data-yaadro-portal-root', '');
  // Zero-size host: fixed/absolute children paint normally; must not cover the shell.
  el.style.cssText = '';
  try {
    body.appendChild(el);
  } catch {
    return null;
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
