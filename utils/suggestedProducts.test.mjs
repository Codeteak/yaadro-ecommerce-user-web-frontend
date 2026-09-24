import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSuggestedProducts,
  buildSuggestedProductSections,
} from './suggestedProducts.js';

describe('buildSuggestedProducts', () => {
  const pool = [
    { id: 'a', category: 'Fruits' },
    { id: 'b', category: 'Dairy' },
    { id: 'c', category: 'Fruits' },
    { id: 'd', category: 'Snacks' },
  ];

  it('keeps products that are already in the cart (no cart-id exclusion)', () => {
    // Caller must not filter by cart — function has no cartProductIds param on purpose.
    const out = buildSuggestedProducts(pool, { limit: 4 });
    assert.deepEqual(
      out.map((p) => p.id),
      ['a', 'b', 'c', 'd'],
    );
  });

  it('prioritizes categories present in the cart without dropping in-cart products', () => {
    const out = buildSuggestedProducts(pool, {
      limit: 4,
      categoryNames: new Set(['fruits']),
    });
    assert.deepEqual(
      out.map((p) => p.id),
      ['a', 'c', 'b', 'd'],
    );
  });

  it('respects limit', () => {
    const out = buildSuggestedProducts(pool, { limit: 2 });
    assert.equal(out.length, 2);
  });
});

describe('buildSuggestedProductSections', () => {
  it('slices without excluding ids', () => {
    const pool = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const sections = buildSuggestedProductSections(pool, {
      sections: [
        { key: 'a', title: 'A', start: 0, end: 2 },
        { key: 'b', title: 'B', start: 2, end: 4 },
      ],
    });
    assert.equal(sections.length, 2);
    assert.deepEqual(
      sections[0].products.map((p) => p.id),
      [1, 2],
    );
    assert.deepEqual(
      sections[1].products.map((p) => p.id),
      [3, 4],
    );
  });
});
