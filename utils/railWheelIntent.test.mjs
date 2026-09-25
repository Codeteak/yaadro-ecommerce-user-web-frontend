import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRailWheelIntent } from './railWheelIntent.js';

test('vertical wheel over rail → page scroll', () => {
  assert.equal(
    resolveRailWheelIntent({ deltaX: 0, deltaY: 80, shiftKey: false, canScrollHoriz: true }),
    'page'
  );
});

test('mostly-vertical trackpad → page scroll', () => {
  assert.equal(
    resolveRailWheelIntent({ deltaX: 10, deltaY: 40, shiftKey: false, canScrollHoriz: true }),
    'page'
  );
});

test('horizontal trackpad → native rail', () => {
  assert.equal(
    resolveRailWheelIntent({ deltaX: 40, deltaY: 5, shiftKey: false, canScrollHoriz: true }),
    'native-h'
  );
});

test('shift+vertical → rail horizontal', () => {
  assert.equal(
    resolveRailWheelIntent({ deltaX: 0, deltaY: 40, shiftKey: true, canScrollHoriz: true }),
    'rail-shift'
  );
});

test('vertical still pages when rail cannot scroll horizontally', () => {
  assert.equal(
    resolveRailWheelIntent({ deltaX: 0, deltaY: 40, shiftKey: false, canScrollHoriz: false }),
    'page'
  );
});
