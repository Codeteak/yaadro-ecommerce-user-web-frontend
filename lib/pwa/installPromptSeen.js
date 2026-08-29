const STORAGE_KEY = 'yaadro-pwa-install-prompt-seen';

export function hasSeenInstallPrompt() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markInstallPromptSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode / blocked storage */
  }
}
