import test from 'node:test';
import assert from 'node:assert/strict';
import { toDisplayText, sanitizeProductUiFields } from './displayText.js';

test('toDisplayText coerces coffee-like API shapes', () => {
  assert.equal(toDisplayText('  Coffee  '), 'Coffee');
  assert.equal(toDisplayText({ name: 'Coffee' }), 'Coffee');
  assert.equal(toDisplayText(['milk', 'soy']), 'milk, soy');
  assert.equal(toDisplayText({ contains: ['dairy', 'nuts'] }), '{"contains":["dairy","nuts"]}');
  assert.equal(toDisplayText(null), '');
  assert.equal(toDisplayText({ label: 'Arabica' }), 'Arabica');
});

test('sanitizeProductUiFields never leaves object children fields', () => {
  const p = sanitizeProductUiFields({
    name: { en: 'Coffee' },
    shortName: { en: 'Coffee' },
    ingredients: { list: ['beans', 'water'] },
    allergenInformation: { contains: ['none'] },
    category: { id: '1', name: 'Beverages' },
    packSize: { size: '250g' },
    brand: { name: 'BRU' },
  });
  assert.equal(typeof p.name, 'string');
  assert.equal(p.name, 'Coffee');
  assert.equal(typeof p.ingredients, 'string');
  assert.equal(typeof p.allergenInformation, 'string');
  assert.equal(typeof p.category, 'string');
  assert.equal(p.category, 'Beverages');
  assert.equal(typeof p.packSize, 'string');
  assert.equal(p.brand, 'BRU');
});
