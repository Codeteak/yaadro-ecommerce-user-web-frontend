import assert from "node:assert/strict";
import test from "node:test";
import {
  bucketProductsByRootSlug,
  resolveRootSlug,
} from "./home-catalog-bucket.ts";

const categories = [
  { id: "r1", slug: "vegetables", parentId: null },
  { id: "c1", slug: "leafy", parentId: "r1" },
  { id: "r2", slug: "dairy", parentId: null },
  { id: "all", slug: "all", parentId: null },
];

test("resolveRootSlug walks to the root", () => {
  const byId = new Map(categories.map((row) => [row.id, row]));
  assert.equal(resolveRootSlug("c1", byId), "vegetables");
  assert.equal(resolveRootSlug("r2", byId), "dairy");
  assert.equal(resolveRootSlug("all", byId), null);
  assert.equal(resolveRootSlug(undefined, byId), null);
});

test("bucketProductsByRootSlug groups browse rows under roots", () => {
  const products = [
    { id: "p1", categoryId: "c1", categorySlug: "leafy" },
    { id: "p2", categoryId: "r2", categorySlug: "dairy" },
    { id: "p3", categorySlug: "vegetables" },
    { id: "p1", categoryId: "c1" }, // dup
  ];
  const buckets = bucketProductsByRootSlug(categories, products);
  assert.deepEqual(
    buckets.vegetables?.map((row) => row.id),
    ["p1", "p3"],
  );
  assert.deepEqual(
    buckets.dairy?.map((row) => row.id),
    ["p2"],
  );
});
