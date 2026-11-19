import assert from "node:assert/strict";
import test from "node:test";

/**
 * Pure reorder helper mirroring setCartQty / setCartWeight (#36).
 * Cart-store itself needs `window`; this locks the order rule in CI.
 */
function updateLineInPlace<T extends { productId: string }>(
  lines: T[],
  productId: string,
  nextLine: T | null,
): T[] {
  const index = lines.findIndex((item) => item.productId === productId);
  if (nextLine == null) {
    return lines.filter((item) => item.productId !== productId);
  }
  if (index >= 0) {
    const next = lines.slice();
    next[index] = nextLine;
    return next;
  }
  return [...lines, nextLine];
}

test("qty edit keeps the line in its original position", () => {
  const start = [
    { productId: "a", qty: 1 },
    { productId: "b", qty: 1 },
    { productId: "c", qty: 1 },
  ];
  const after = updateLineInPlace(start, "a", { productId: "a", qty: 3 });
  assert.deepEqual(
    after.map((l) => l.productId),
    ["a", "b", "c"],
  );
  assert.equal(after[0]?.qty, 3);
});

test("removing a middle line does not reshuffle the rest", () => {
  const start = [
    { productId: "a", qty: 1 },
    { productId: "b", qty: 1 },
    { productId: "c", qty: 1 },
  ];
  const after = updateLineInPlace(start, "b", null);
  assert.deepEqual(
    after.map((l) => l.productId),
    ["a", "c"],
  );
});
