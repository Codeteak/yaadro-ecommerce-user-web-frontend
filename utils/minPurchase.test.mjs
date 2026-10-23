/**
 * Run: node --test utils/minPurchase.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMinPurchaseFromSummary, minPurchaseUserMessage } from './minPurchase.js';

test('parseMinPurchaseFromSummary trusts remaining 0 when the field is present', () => {
  const parsed = parseMinPurchaseFromSummary({
    min_purchase_minor: 20000,
    min_purchase_remaining_minor: 0,
    subtotal_minor: 5000,
  });
  assert.equal(parsed.minPurchaseMinor, 20000);
  assert.equal(parsed.minPurchaseRemainingMinor, 0);
  assert.equal(parsed.hasTrustedMinPurchase, true);
});

test('parseMinPurchaseFromSummary treats missing remaining as derived, missing min as 0', () => {
  const missing = parseMinPurchaseFromSummary({ subtotal_minor: 5000 });
  assert.equal(missing.minPurchaseMinor, 0);
  assert.equal(missing.minPurchaseRemainingMinor, 0);
  assert.equal(missing.hasTrustedMinPurchase, false);

  const derived = parseMinPurchaseFromSummary({
    min_purchase_minor: 20000,
    subtotal_minor: 15000,
  });
  assert.equal(derived.minPurchaseRemainingMinor, 5000);
});

test('minPurchaseUserMessage uses rupee grouping', () => {
  assert.equal(
    minPurchaseUserMessage(20000, 150),
    "Add ₹1.50 more to meet this shop's ₹200 minimum order.",
  );
});
