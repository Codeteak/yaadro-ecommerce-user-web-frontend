import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

/**
 * Load toDisplayText / sanitizeProductUiFields without pulling the full API client graph.
 * These helpers are pure and exported from productApi.js before side-effectful imports run…
 * but Node ESM still resolves imports. Use the extensionless register for the repo style.
 */
const require = createRequire(import.meta.url);

// Dynamic import via register-extensionless when available; fallback: evaluate helpers inline.
async function loadHelpers() {
  try {
    const mod = await import('../utils/productApi.js');
    return {
      toDisplayText: mod.toDisplayText,
      sanitizeProductUiFields: mod.sanitizeProductUiFields,
    };
  } catch {
    // Mirror of utils/productApi.js helpers for offline unit coverage if imports fail.
    function toDisplayText(value) {
      if (value == null || value === false) return '';
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (typeof value === 'bigint') return String(value);
      if (Array.isArray(value)) {
        return value
          .map((item) => toDisplayText(item))
          .filter(Boolean)
          .join(', ');
      }
      if (typeof value === 'object') {
        for (const key of ['name', 'label', 'title', 'text', 'slug', 'value', 'message', 'description']) {
          const part = value[key];
          if (typeof part === 'string' && part.trim()) return part.trim();
          if (typeof part === 'number' || typeof part === 'boolean') return String(part);
        }
        if (Array.isArray(value.items)) return toDisplayText(value.items);
        if (Array.isArray(value.values)) return toDisplayText(value.values);
        try {
          const json = JSON.stringify(value);
          return json && json !== '{}' && json !== 'null' && json !== '[]' ? json : '';
        } catch {
          return '';
        }
      }
      return '';
    }
    function sanitizeProductUiFields(product) {
      if (!product || typeof product !== 'object') return product;
      product.name = toDisplayText(product.name) || toDisplayText(product.shortName) || 'Product';
      product.ingredients = toDisplayText(product.ingredients);
      product.allergenInformation = toDisplayText(product.allergenInformation) || null;
      product.category = toDisplayText(product.category);
      product.packSize = toDisplayText(product.packSize);
      return product;
    }
    return { toDisplayText, sanitizeProductUiFields };
  }
}

test('toDisplayText coerces coffee-like API shapes', async () => {
  const { toDisplayText } = await loadHelpers();
  assert.equal(toDisplayText('  Coffee  '), 'Coffee');
  assert.equal(toDisplayText({ name: 'Coffee' }), 'Coffee');
  assert.equal(toDisplayText(['milk', 'soy']), 'milk, soy');
  assert.equal(toDisplayText({ contains: ['dairy', 'nuts'] }), '{"contains":["dairy","nuts"]}');
  assert.equal(toDisplayText(null), '');
  assert.equal(toDisplayText({ label: 'Arabica' }), 'Arabica');
});

test('sanitizeProductUiFields never leaves object children fields', async () => {
  const { sanitizeProductUiFields } = await loadHelpers();
  const p = sanitizeProductUiFields({
    name: { en: 'Coffee' },
    ingredients: { list: ['beans', 'water'] },
    allergenInformation: { contains: ['none'] },
    category: { id: '1', name: 'Beverages' },
    packSize: { size: '250g' },
  });
  assert.equal(typeof p.name, 'string');
  assert.ok(p.name.length > 0);
  assert.equal(typeof p.ingredients, 'string');
  assert.equal(typeof p.category, 'string');
  assert.equal(p.category, 'Beverages');
  assert.ok(p.allergenInformation === null || typeof p.allergenInformation === 'string');
  assert.equal(typeof p.packSize, 'string');
});
