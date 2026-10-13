import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogOfferSavingsMajor,
  isGramScaleListMismatch,
  resolveCatalogListAndPay,
} from './catalogOfferPricing.js';

test('a real catalog offer still saves list minus pay', () => {
  assert.equal(catalogOfferSavingsMajor(40, 30, 1), 10);
  assert.equal(isGramScaleListMismatch(40, 30), false);
});

test('a list about 1000× pay is a gram scale mismatch, not a discount', () => {
  assert.equal(isGramScaleListMismatch(1100, 1.1), true);
  assert.equal(isGramScaleListMismatch(20000, 20), true);
  assert.equal(catalogOfferSavingsMajor(1100, 1.1, 1), 0);

  const resolved = resolveCatalogListAndPay({
    list_price_minor: 110000,
    offer_price_minor: 110,
  });
  assert.equal(resolved.listUnit, null);
  assert.equal(resolved.hasOffer, false);
  assert.equal(resolved.payUnit, 1.1);
});
