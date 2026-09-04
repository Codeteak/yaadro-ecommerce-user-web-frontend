import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleCoalescedCatalogRefetch, resetCatalogRefetchCoalesceForTests } from './coalesceCatalogRefetch.js';

function createMockQueryClient() {
  const invalidated = [];
  return {
    invalidated,
    invalidateQueries(opts) {
      invalidated.push(opts);
      return Promise.resolve();
    },
    setQueriesData() {},
  };
}

test('scheduleCoalescedCatalogRefetch without productIds uses light active invalidation', async () => {
  resetCatalogRefetchCoalesceForTests();
  const qc = createMockQueryClient();
  scheduleCoalescedCatalogRefetch(qc);
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(qc.invalidated.length, 1);
  assert.equal(qc.invalidated[0].refetchType, 'active');
});

test('scheduleCoalescedCatalogRefetch coalesces bursts within gap window', async () => {
  resetCatalogRefetchCoalesceForTests();
  const qc = createMockQueryClient();
  scheduleCoalescedCatalogRefetch(qc);
  scheduleCoalescedCatalogRefetch(qc);
  scheduleCoalescedCatalogRefetch(qc);
  await new Promise((r) => setTimeout(r, 0));

  assert.equal(qc.invalidated.length, 1, 'immediate burst should coalesce to one invalidate');
});
