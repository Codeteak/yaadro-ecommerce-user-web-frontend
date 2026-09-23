import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCatalogProductIds,
  patchProductInCatalogCaches,
} from './applyCatalogProductUpdates.js';

test('normalizeCatalogProductIds dedupes ids', () => {
  assert.deepEqual(normalizeCatalogProductIds(['a', 'a', 'b']), ['a', 'b']);
});

test('patchProductInCatalogCaches updates one row in shop-scoped infinite pages', () => {
  const patches = [];
  const queryClient = {
    setQueriesData(opts, updater) {
      patches.push({ opts, updater });
    },
  };

  const old = {
    pages: [{ products: [{ id: 'p1', price: 10 }, { id: 'p2', price: 20 }] }],
  };
  patchProductInCatalogCaches(queryClient, { id: 'p1', price: 99 });

  assert.equal(patches.length, 2);
  const listPatch = patches.find((p) =>
    p.opts.predicate({ queryKey: ['products', 'shop-1', 'infinite', {}] })
  );
  assert.ok(listPatch, 'predicate should match shop-scoped infinite keys');
  const next = listPatch.updater(old);
  assert.equal(next.pages[0].products[0].price, 99);
  assert.equal(next.pages[0].products[1].price, 20);

  const detailPatch = patches.find((p) =>
    p.opts.predicate({ queryKey: ['products', 'shop-1', 'detail', 'p1'] })
  );
  assert.ok(detailPatch, 'predicate should match shop-scoped detail keys');
});
