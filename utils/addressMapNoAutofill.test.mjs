/**
 * Regression: map/edit address hydration must never seed form lines from
 * map provider displayName / Plus Codes / formatted_address.
 */
import assert from 'node:assert/strict';
import { sanitizeStoredStreetArea } from '../utils/formatAddress.js';

function buildAddressFromExisting(addr) {
  if (!addr) return null;
  const line1 = String(addr.line1 || addr.apartment || addr.flat || addr.building || '').trim();
  const line2 = sanitizeStoredStreetArea(String(addr.line2 || '').trim(), addr);
  return {
    label: addr.label || 'Home',
    line1,
    line2,
    landmark: addr.landmark || '',
    city: addr.city || '',
    raw: addr.raw != null ? String(addr.raw) : '',
  };
}

{
  const form = buildAddressFromExisting({
    line1: '12 MG Road',
    line2: '',
    displayName: 'GHN+XX Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    landmark: '',
  });
  assert.equal(form.line1, '12 MG Road');
  assert.equal(form.line2, '');
  assert.ok(!String(form.line2).includes('GHN'));
  assert.ok(!String(form.line1).includes('GHN'));
}

{
  const form = buildAddressFromExisting({
    line1: '',
    line2: 'Koramangala 5th Block',
    displayName: 'Plus Code ABC, Bengaluru',
    city: 'Bengaluru',
  });
  assert.equal(form.line2, 'Koramangala 5th Block');
  assert.ok(!String(form.line2).includes('Plus Code'));
}

console.log('addressMapNoAutofill.test.mjs: ok');
