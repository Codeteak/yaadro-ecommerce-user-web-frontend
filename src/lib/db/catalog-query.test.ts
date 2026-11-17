import assert from "node:assert/strict";
import test from "node:test";
import { buildProductListQuery } from "./catalog-query.ts";
import { haversineMeters } from "./haversine.ts";
import { toIlikePattern } from "./search.ts";

test("search text stays a bound value", () => {
  const attack = "tomatoes' OR 1=1; drop table shop_products;--";
  const { text, values } = buildProductListQuery({ search: attack, limit: 50 });
  assert.equal(text.includes(attack), false);
  assert.equal(text.includes("drop table"), false);
  assert.equal(values[3], toIlikePattern(attack));
  assert.match(text, /ILIKE \$4 ESCAPE/);
});

test("like wildcards in search are escaped inside the bound pattern", () => {
  assert.equal(toIlikePattern("100%_off"), "%100\\%\\_off%");
});

test("a category id that is not a uuid is not written into the statement", () => {
  const { text, values } = buildProductListQuery({
    categoryId: "fruits; drop table shop_products",
    includeDescendants: true,
    limit: 50,
  });
  assert.equal(text.includes("drop table"), false);
  assert.equal(text.includes("WITH RECURSIVE"), false);
  assert.equal(values[1], null);
});

test("haversine matches a one-degree step along the equator", () => {
  const meters = haversineMeters(0, 0, 0, 1);
  assert.ok(meters > 111_000 && meters < 112_000);
});
