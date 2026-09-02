import test from 'node:test';
import assert from 'node:assert/strict';

test('startCatalogRevisionPoll is noop without shopId', async () => {
  const { startCatalogRevisionPoll } = await import('./catalogRevisionPoll.js');
  const stop = startCatalogRevisionPoll({ shopId: '', queryClient: {} });
  assert.equal(typeof stop, 'function');
  stop();
});
