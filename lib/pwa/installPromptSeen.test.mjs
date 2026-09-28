import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  hasSeenInstallPrompt,
  isInstallPromptHomePath,
  markInstallPromptSeen,
} from './installPromptSeen.js';

const LOCAL_KEY = 'yaadro-pwa-install-prompt-seen';
const SESSION_KEY = 'yaadro-pwa-install-prompt-session';

function memoryStore() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: k => {
      map.delete(k);
    },
  };
}

describe('isInstallPromptHomePath', () => {
  it('matches only the storefront home path', () => {
    assert.equal(isInstallPromptHomePath('/'), true);
    assert.equal(isInstallPromptHomePath(''), true);
    assert.equal(isInstallPromptHomePath('/products/1'), false);
    assert.equal(isInstallPromptHomePath('/cart'), false);
  });
});

describe('install prompt seen flags', () => {
  let local;
  let session;

  beforeEach(() => {
    local = memoryStore();
    session = memoryStore();
    globalThis.window = {
      localStorage: local,
      sessionStorage: session,
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('starts unseen', () => {
    assert.equal(hasSeenInstallPrompt(), false);
  });

  it('markInstallPromptSeen persists across hasSeen checks', () => {
    markInstallPromptSeen();
    assert.equal(hasSeenInstallPrompt(), true);
    assert.equal(local.getItem(LOCAL_KEY), '1');
    assert.equal(session.getItem(SESSION_KEY), '1');
  });

  it('treats localStorage alone as seen', () => {
    local.setItem(LOCAL_KEY, '1');
    assert.equal(hasSeenInstallPrompt(), true);
  });

  it('treats sessionStorage alone as seen', () => {
    session.setItem(SESSION_KEY, '1');
    assert.equal(hasSeenInstallPrompt(), true);
  });
});
