import assert from "node:assert/strict";
import test from "node:test";
import { isDairySectionTitle } from "./daily-dairy-title.ts";

test("isDairySectionTitle matches admin Daily Diary and Daily Dairy", () => {
  assert.equal(isDairySectionTitle("Daily Diary"), true);
  assert.equal(isDairySectionTitle("Daily Dairy"), true);
  assert.equal(isDairySectionTitle("dairy"), true);
  assert.equal(isDairySectionTitle("Milk & Eggs"), true);
  assert.equal(isDairySectionTitle("PRICE DROP"), false);
  assert.equal(isDairySectionTitle("Festive"), false);
});
