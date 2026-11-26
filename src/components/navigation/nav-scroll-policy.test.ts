import assert from "node:assert/strict";
import test from "node:test";
import {
  NAV_NEAR_BOTTOM_PX,
  navScrollAction,
} from "./nav-scroll-policy.ts";

test("navScrollAction shows near the top even with tiny dy", () => {
  assert.equal(
    navScrollAction({ y: 20, dy: 0, nearTop: 140, maxY: 800 }),
    "show",
  );
});

test("navScrollAction hides on scroll down past the top band", () => {
  assert.equal(
    navScrollAction({ y: 200, dy: 12, nearTop: 140, maxY: 800 }),
    "hide",
  );
});

test("navScrollAction shows on scroll up when clear of the bottom", () => {
  assert.equal(
    navScrollAction({ y: 400, dy: -10, nearTop: 140, maxY: 800 }),
    "show",
  );
});

test("navScrollAction keeps hidden on upward clamp while pinned at the bottom", () => {
  // Clearance collapse (~88px) clamps scrollY; distanceToBottom stays ~0.
  assert.equal(
    navScrollAction({ y: 800, dy: -88, nearTop: 140, maxY: 800 }),
    "keep",
  );
});

test("navScrollAction shows once the user scrolls up out of the bottom dead zone", () => {
  const maxY = 800;
  const y = maxY - (NAV_NEAR_BOTTOM_PX + 1);
  assert.equal(
    navScrollAction({ y, dy: -20, nearTop: 140, maxY }),
    "show",
  );
});

test("navScrollAction keeps state for sub-threshold dy mid-page", () => {
  assert.equal(
    navScrollAction({ y: 300, dy: 2, nearTop: 140, maxY: 800 }),
    "keep",
  );
});
