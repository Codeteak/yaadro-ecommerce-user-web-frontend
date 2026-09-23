/**
 * Run: node --test utils/addressApi.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeAddressNotes,
  toStorefrontAddressBody,
  toStorefrontAddressPatch,
} from './storefrontAddressPayload.mjs';

test('sanitizeAddressNotes drops JSON dumps and objects', () => {
  assert.equal(sanitizeAddressNotes(null), '');
  assert.equal(sanitizeAddressNotes({ line1: 'x' }), '');
  assert.equal(sanitizeAddressNotes('{"line1":"x"}'), '');
  assert.equal(sanitizeAddressNotes('Gate code 12'), 'Gate code 12');
});

test('toStorefrontAddressBody keeps only allowed fields', () => {
  const body = toStorefrontAddressBody({
    line1: '12 Hill',
    line2: 'Apt 4',
    landmark: 'Station',
    city: 'Mumbai',
    state: 'MH',
    postalCode: '400050',
    country: 'India',
    zipCode: '400050',
    lat: 19.1,
    lng: 72.8,
    raw: 'Ring bell',
  });
  assert.deepEqual(body, {
    line1: '12 Hill',
    line2: 'Apt 4',
    landmark: 'Station',
    city: 'Mumbai',
    lat: 19.1,
    lng: 72.8,
    raw: 'Ring bell',
  });
  assert.equal('state' in body, false);
  assert.equal('postalCode' in body, false);
  assert.equal('country' in body, false);
  assert.equal('zipCode' in body, false);
});

test('toStorefrontAddressPatch only includes defined kept fields', () => {
  const patch = toStorefrontAddressPatch({
    landmark: 'Near metro',
    state: 'MH',
    postalCode: '400001',
  });
  assert.deepEqual(patch, { landmark: 'Near metro' });
  assert.equal('state' in patch, false);
  assert.equal('postalCode' in patch, false);
});

test('toStorefrontAddressPatch can clear line2 with null', () => {
  const patch = toStorefrontAddressPatch({ line2: null });
  assert.equal(patch.line2, null);
});
