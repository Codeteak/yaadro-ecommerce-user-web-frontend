const LOCAL_KEY = 'yaadro-pwa-install-prompt-seen';
const SESSION_KEY = 'yaadro-pwa-install-prompt-session';

function readFlag(store, key) {
  if (typeof window === 'undefined') return false;
  try {
    return store.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(store, key) {
  if (typeof window === 'undefined') return;
  try {
    store.setItem(key, '1');
  } catch {
    /* private mode / blocked storage */
  }
}

export function hasSeenInstallPrompt() {
  if (typeof window === 'undefined') return false;
  return readFlag(window.sessionStorage, SESSION_KEY) || readFlag(window.localStorage, LOCAL_KEY);
}

export function markInstallPromptSeen() {
  if (typeof window === 'undefined') return;
  writeFlag(window.sessionStorage, SESSION_KEY);
  writeFlag(window.localStorage, LOCAL_KEY);
}

export function isInstallPromptHomePath(pathname) {
  return pathname === '/' || pathname === '';
}
