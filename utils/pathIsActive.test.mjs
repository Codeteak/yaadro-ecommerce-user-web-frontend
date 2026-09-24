import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pathIsActive } from './pathIsActive.js';

describe('pathIsActive', () => {
  it('matches Home only on exact /', () => {
    assert.equal(pathIsActive('/', '/'), true);
    assert.equal(pathIsActive('/categories', '/'), false);
    assert.equal(pathIsActive('/products', '/'), false);
    assert.equal(pathIsActive('/events', '/'), false);
  });

  it('matches prefix routes for nested pages', () => {
    assert.equal(pathIsActive('/products', '/products'), true);
    assert.equal(pathIsActive('/products/orange', '/products'), true);
    assert.equal(pathIsActive('/categories/fruit', '/categories'), true);
    assert.equal(pathIsActive('/orders', '/orders'), true);
    assert.equal(pathIsActive('/orders/abc', '/orders'), true);
  });

  it('does not cross-match sibling sections', () => {
    assert.equal(pathIsActive('/products', '/categories'), false);
    assert.equal(pathIsActive('/orders', '/products'), false);
    assert.equal(pathIsActive('/addresses', '/orders'), false);
  });

  it('normalizes trailing slashes', () => {
    assert.equal(pathIsActive('/products/', '/products'), true);
    assert.equal(pathIsActive('/categories/', '/categories/'), true);
  });
});
