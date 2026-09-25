import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMiniSearchIndex, runMiniSearch, toMiniSearchDoc } from './miniSearchCatalog.js';

const ORGANIC_APPLE = {
  id: 'organic-apple-1',
  name: 'Organic Apple',
  slug: 'organic-apple',
  category: 'Fruits',
  brand: '',
};

const BANANA = {
  id: 'banana-1',
  name: 'Banana',
  slug: 'banana',
  category: 'Fruits',
  brand: '',
};

function hitIds(mini, query) {
  return runMiniSearch(mini, query, 20).map((h) => String(h.id));
}

test('toMiniSearchDoc indexes name as separate searchable text', () => {
  const doc = toMiniSearchDoc(ORGANIC_APPLE);
  assert.equal(doc.name, 'Organic Apple');
  assert.match(doc.text, /Organic Apple/);
  assert.match(doc.slug, /organic-apple/);
});

test('MiniSearch token search: apple finds Organic Apple', () => {
  const { mini } = buildMiniSearchIndex([ORGANIC_APPLE, BANANA]);

  for (const q of ['apple', 'Apple', 'APPLE', 'aPpLe']) {
    assert.deepEqual(hitIds(mini, q), ['organic-apple-1'], `query=${q}`);
  }
});

test('MiniSearch token search: organic / multi-term / unordered', () => {
  const { mini } = buildMiniSearchIndex([ORGANIC_APPLE, BANANA]);

  assert.deepEqual(hitIds(mini, 'organic'), ['organic-apple-1']);
  assert.deepEqual(hitIds(mini, 'organic apple'), ['organic-apple-1']);
  assert.deepEqual(hitIds(mini, 'apple organic'), ['organic-apple-1']);
  assert.deepEqual(hitIds(mini, 'banana'), ['banana-1']);
  assert.equal(hitIds(mini, 'banana').includes('organic-apple-1'), false);
});

test('MiniSearch prefix: app / orga match when prefix:true', () => {
  const { mini } = buildMiniSearchIndex([ORGANIC_APPLE, BANANA]);
  assert.deepEqual(hitIds(mini, 'app'), ['organic-apple-1']);
  assert.deepEqual(hitIds(mini, 'orga'), ['organic-apple-1']);
});

test('runMiniSearch ignores queries shorter than 2 chars', () => {
  const { mini } = buildMiniSearchIndex([ORGANIC_APPLE]);
  assert.deepEqual(hitIds(mini, 'a'), []);
  assert.deepEqual(hitIds(mini, ' '), []);
});
