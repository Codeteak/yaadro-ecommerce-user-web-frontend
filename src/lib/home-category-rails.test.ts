import assert from "node:assert/strict";
import test from "node:test";
import { categoryProductRails } from "./home-category-rails.ts";

const categories = [
  { slug: "fruits", name: "Fruits" },
  { slug: "chips", name: "Chips" },
  { slug: "chocolates", name: "Chocolates" },
  { slug: "empty", name: "Empty aisle" },
];

const productsBySlug = {
  fruits: [{ id: "f1" }, { id: "f2" }],
  chips: [{ id: "c1" }, { id: "c1" }, { id: "c2" }, { id: "c3" }],
  chocolates: [{ id: "h1" }],
  empty: [] as { id: string }[],
};

test("skips produce and empty categories, keeps order", () => {
  const rails = categoryProductRails(categories, productsBySlug);
  assert.deepEqual(
    rails.map((r) => r.slug),
    ["chips", "chocolates"],
  );
  assert.equal(rails[0]?.title, "Chips");
});

test("dedupes within a rail and respects maxPerRail", () => {
  const rails = categoryProductRails(categories, productsBySlug, {
    maxPerRail: 2,
  });
  const chips = rails.find((r) => r.slug === "chips");
  assert.ok(chips);
  assert.deepEqual(
    chips.products.map((p) => p.id),
    ["c1", "c2"],
  );
});

test("custom exclude list can keep produce", () => {
  const rails = categoryProductRails(categories, productsBySlug, {
    exclude: [],
  });
  assert.equal(rails[0]?.slug, "fruits");
});
