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

test("sortHomeShelvesByOrder matches admin drag order (PRICE DROP then Daily Diary)", () => {
  const sorted = sortHomeShelvesByOrder([
    { id: "diary", title: "Daily Diary", sortOrder: 20 },
    { id: "drop", title: "PRICE DROP", sortOrder: 10 },
    { id: "festive", title: "Festive", sortOrder: 30 },
  ]);
  assert.deepEqual(
    sorted.map((s) => s.title),
    ["PRICE DROP", "Daily Diary", "Festive"],
  );
});

test("sortHomeShelvesByOrder pushes non-finite sortOrder last", () => {
  const sorted = sortHomeShelvesByOrder([
    { id: "x", title: "Zeta", sortOrder: Number.NaN },
    { id: "a", title: "Alpha", sortOrder: 5 },
  ]);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ["a", "x"],
  );
});
