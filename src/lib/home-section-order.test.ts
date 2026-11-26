import assert from "node:assert/strict";
import test from "node:test";
import { sortHomeShelvesByOrder } from "./home-section-order.ts";

test("sortHomeShelvesByOrder follows admin sortOrder ascending", () => {
  const sorted = sortHomeShelvesByOrder([
    { id: "c", title: "Festive", sortOrder: 30 },
    { id: "a", title: "Dairy", sortOrder: 10 },
    { id: "b", title: "Featured", sortOrder: 20 },
  ]);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ["a", "b", "c"],
  );
});

test("sortHomeShelvesByOrder ties break on title", () => {
  const sorted = sortHomeShelvesByOrder([
    { id: "2", title: "Beta", sortOrder: 1 },
    { id: "1", title: "Alpha", sortOrder: 1 },
  ]);
  assert.deepEqual(
    sorted.map((s) => s.title),
    ["Alpha", "Beta"],
  );
});
