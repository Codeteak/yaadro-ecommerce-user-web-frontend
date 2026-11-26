import assert from "node:assert/strict";
import test from "node:test";
import { mapPool } from "./map-pool.ts";

test("mapPool preserves order and respects concurrency", async () => {
  let live = 0;
  let peak = 0;
  const values = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((resolve) => setTimeout(resolve, 20));
    live -= 1;
    return n * 10;
  });
  assert.deepEqual(values, [10, 20, 30, 40, 50]);
  assert.ok(peak <= 2);
});

test("mapPool returns empty for empty input", async () => {
  assert.deepEqual(await mapPool([], 3, async () => 1), []);
});
