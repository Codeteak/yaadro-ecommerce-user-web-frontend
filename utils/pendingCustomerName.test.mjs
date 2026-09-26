import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizePendingCustomerName } from './pendingCustomerName.js';

describe('normalizePendingCustomerName', () => {
  it('trims and collapses whitespace', () => {
    assert.equal(normalizePendingCustomerName('  Alan   Joshy  '), 'Alan Joshy');
  });

  it('caps length at 120', () => {
    const long = 'a'.repeat(200);
    assert.equal(normalizePendingCustomerName(long).length, 120);
  });

  it('returns empty for blank input', () => {
    assert.equal(normalizePendingCustomerName('   '), '');
    assert.equal(normalizePendingCustomerName(null), '');
  });
});
