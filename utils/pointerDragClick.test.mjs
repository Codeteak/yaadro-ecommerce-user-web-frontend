/**
 * Run: npm run test:pointer-drag  (or: node --test utils/pointerDragClick.test.mjs)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AXIS_LOCK_PX,
  DRAG_CLICK_PX,
  resolvePointerAxis,
  shouldMarkAsDrag,
  shouldSuppressClickAfterDrag,
} from './pointerDragClick.js';

test('DRAG_CLICK_PX is large enough for typical mobile tap wobble', () => {
  assert.ok(DRAG_CLICK_PX >= 20, `expected >= 20, got ${DRAG_CLICK_PX}`);
});

test('AXIS_LOCK_PX waits past tiny noise before choosing an axis', () => {
  assert.ok(AXIS_LOCK_PX >= 8);
  assert.equal(resolvePointerAxis(4, 3), null);
  assert.equal(resolvePointerAxis(AXIS_LOCK_PX, 2), 'x');
  assert.equal(resolvePointerAxis(2, AXIS_LOCK_PX), 'y');
});

test('resolvePointerAxis prefers the dominant axis', () => {
  assert.equal(resolvePointerAxis(30, 12), 'x');
  assert.equal(resolvePointerAxis(12, 30), 'y');
});

test('shouldMarkAsDrag ignores sub-threshold wobble', () => {
  assert.equal(shouldMarkAsDrag(0), false);
  assert.equal(shouldMarkAsDrag(8), false);
  assert.equal(shouldMarkAsDrag(DRAG_CLICK_PX), false);
  assert.equal(shouldMarkAsDrag(DRAG_CLICK_PX + 1), true);
  assert.equal(shouldMarkAsDrag(-(DRAG_CLICK_PX + 5)), true);
});

test('shouldSuppressClickAfterDrag allows tap with finger wobble under threshold', () => {
  // Old bug: 8–15px wobble set didDrag=true and killed the click.
  assert.equal(
    shouldSuppressClickAfterDrag({ didDrag: true, totalDeltaX: 12 }),
    false
  );
  assert.equal(
    shouldSuppressClickAfterDrag({ didDrag: true, totalDeltaX: -15 }),
    false
  );
  assert.equal(
    shouldSuppressClickAfterDrag({ didDrag: false, totalDeltaX: 100 }),
    false
  );
});

test('shouldSuppressClickAfterDrag blocks click after a real horizontal drag', () => {
  assert.equal(
    shouldSuppressClickAfterDrag({
      didDrag: true,
      totalDeltaX: DRAG_CLICK_PX + 10,
    }),
    true
  );
});

test('shouldSuppressClickAfterDrag clears false drag when finger returns near start', () => {
  // Peaked past threshold mid-gesture, released near origin — treat as tap.
  assert.equal(
    shouldSuppressClickAfterDrag({ didDrag: true, totalDeltaX: 3 }),
    false
  );
});
