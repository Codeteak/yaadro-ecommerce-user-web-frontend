import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decodeStorefrontProductCursor,
  encodeStorefrontProductCursor,
} from './storefrontProductCursor.js';

describe('storefront product cursor', () => {
  it('round-trips created_at + id like the customer API', () => {
    const t = '2026-09-28T06:00:00.000Z';
    const id = '11111111-1111-4111-8111-111111111111';
    const cursor = encodeStorefrontProductCursor(t, id);
    assert.ok(cursor);
    assert.deepEqual(decodeStorefrontProductCursor(cursor), {
      createdAt: t,
      id,
    });
  });

  it('accepts Date instances when encoding', () => {
    const d = new Date('2026-01-15T12:34:56.000Z');
    const id = '22222222-2222-4222-8222-222222222222';
    const cursor = encodeStorefrontProductCursor(d, id);
    assert.equal(decodeStorefrontProductCursor(cursor)?.createdAt, d.toISOString());
    assert.equal(decodeStorefrontProductCursor(cursor)?.id, id);
  });

  it('returns null for invalid cursors', () => {
    assert.equal(decodeStorefrontProductCursor(null), null);
    assert.equal(decodeStorefrontProductCursor(''), null);
    assert.equal(decodeStorefrontProductCursor('not-base64'), null);
    assert.equal(encodeStorefrontProductCursor(null, 'x'), null);
    assert.equal(encodeStorefrontProductCursor('t', null), null);
  });
});
