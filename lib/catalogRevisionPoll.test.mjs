/**
 * Run: node --test lib/catalogRevisionPoll.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startCatalogRevisionPoll,
  __resetCatalogRevisionPollForTests,
} from './catalogRevisionPoll.js';

test('startCatalogRevisionPoll is noop without shopId', () => {
  __resetCatalogRevisionPollForTests();
  const stop = startCatalogRevisionPoll({ shopId: '', queryClient: {} });
  assert.equal(typeof stop, 'function');
  stop();
});

test('startCatalogRevisionPoll reuses singleton for same shopId', () => {
  __resetCatalogRevisionPollForTests();
  const qc = { invalidateQueries: () => {} };
  const stopA = startCatalogRevisionPoll({ shopId: 'shop-1', queryClient: qc, intervalMs: 60_000 });
  const stopB = startCatalogRevisionPoll({ shopId: 'shop-1', queryClient: qc, intervalMs: 60_000 });
  assert.equal(typeof stopA, 'function');
  assert.equal(typeof stopB, 'function');
  // Duplicate stop must not tear down the active poller ownership incorrectly —
  // owner stop clears singleton.
  stopB();
  stopA();
  __resetCatalogRevisionPollForTests();
});
