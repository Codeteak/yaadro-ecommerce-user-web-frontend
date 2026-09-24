import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  markPostOrderBackToHome,
  clearPostOrderBackToHome,
  shouldPostOrderBackToHome,
  orderDetailHref,
  POST_ORDER_BACK_HOME_KEY,
} from './checkoutSession.js';

describe('post-order navigation helpers', () => {
  const store = new Map();

  beforeEach(() => {
    store.clear();
    globalThis.window = {
      sessionStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => {
          store.set(k, String(v));
        },
        removeItem: (k) => {
          store.delete(k);
        },
      },
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('marks and matches the created order id for back-to-home', () => {
    markPostOrderBackToHome('ord-1');
    assert.equal(store.get(POST_ORDER_BACK_HOME_KEY), 'ord-1');
    assert.equal(shouldPostOrderBackToHome('ord-1'), true);
    assert.equal(shouldPostOrderBackToHome('ord-2'), false);
  });

  it('clears the marker', () => {
    markPostOrderBackToHome('ord-1');
    clearPostOrderBackToHome();
    assert.equal(shouldPostOrderBackToHome('ord-1'), false);
  });

  it('builds the existing order detail href', () => {
    assert.equal(orderDetailHref('abc 1'), '/order?id=abc%201');
    assert.equal(orderDetailHref(''), '/orders');
  });
});
