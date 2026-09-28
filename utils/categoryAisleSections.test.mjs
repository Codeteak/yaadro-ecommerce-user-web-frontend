import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupCategoriesIntoAisles,
  isAllBrowseCategory,
  resolveCategoryAisleId,
} from './categoryAisleSections.js';

test('Fruits and Vegetables map to Fresh', () => {
  assert.equal(resolveCategoryAisleId({ name: 'Fruits', slug: 'fruits' }), 'fresh');
  assert.equal(resolveCategoryAisleId({ name: 'Vegetables', slug: 'vegetables' }), 'fresh');
});

test('Household and Personal Care map to Home & personal care', () => {
  assert.equal(
    resolveCategoryAisleId({ name: 'Household Supplies', slug: 'household-supplies' }),
    'home-personal'
  );
  assert.equal(
    resolveCategoryAisleId({ name: 'Home Fragrance', slug: 'home-fragrance' }),
    'home-personal'
  );
  assert.equal(
    resolveCategoryAisleId({ name: 'Personal Care', slug: 'personal-care' }),
    'home-personal'
  );
});

test('unknown categories fall into More', () => {
  assert.equal(resolveCategoryAisleId({ name: 'Pet Care', slug: 'pet-care' }), 'more');
  assert.equal(resolveCategoryAisleId({ name: 'Electronics', slug: 'electronics' }), 'more');
});

test('IceCreams and Chips map to Snacks & Sweets', () => {
  assert.equal(resolveCategoryAisleId({ name: 'IceCreams', slug: 'icecreams' }), 'snacks-sweets');
  assert.equal(resolveCategoryAisleId({ name: 'Chips', slug: 'chips' }), 'snacks-sweets');
});

test('isAllBrowseCategory detects All', () => {
  assert.equal(isAllBrowseCategory({ name: 'All', slug: 'all' }), true);
  assert.equal(isAllBrowseCategory({ name: 'Fruits' }), false);
});

test('groupCategoriesIntoAisles pins All first and omits empty aisles', () => {
  const sections = groupCategoriesIntoAisles([
    { id: '1', name: 'All', slug: 'all' },
    { id: '2', name: 'Fruits', slug: 'fruits' },
    { id: '3', name: 'Vegetables', slug: 'vegetables' },
    { id: '4', name: 'Household Supplies', slug: 'household-supplies' },
    { id: '5', name: 'Weird Aisle', slug: 'weird-aisle' },
  ]);

  assert.deepEqual(
    sections.map((s) => s.id),
    ['fresh', 'home-personal', 'more']
  );
  assert.equal(sections[0].categories[0].name, 'All');
  assert.equal(sections[0].categories[1].name, 'Fruits');
  assert.equal(sections[0].title, 'Fresh');
  assert.equal(sections[1].title, 'Home & personal care');
  assert.equal(sections[2].categories[0].name, 'Weird Aisle');
});

test('groupCategoriesIntoAisles works on a search-filtered subset', () => {
  const filtered = [
    { id: '2', name: 'Fruits', slug: 'fruits' },
    { id: '4', name: 'Household Supplies', slug: 'household-supplies' },
  ];
  const sections = groupCategoriesIntoAisles(filtered);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].id, 'fresh');
  assert.equal(sections[0].categories.length, 1);
  assert.equal(sections[1].id, 'home-personal');
});

test('All alone becomes Browse section', () => {
  const sections = groupCategoriesIntoAisles([{ id: '1', name: 'All', slug: 'all' }]);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].id, 'browse');
  assert.equal(sections[0].categories[0].name, 'All');
});
