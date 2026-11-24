import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogPriceDisplay } from "./catalog-price-display.ts";

describe("catalogPriceDisplay", () => {
  it("scales weight products to the minimum step", () => {
    const display = catalogPriceDisplay({
      price: 100,
      mrp: 120,
      unit: "kg",
      customization: { type: "weight", stepKg: 0.25, minKg: 0.25, maxKg: 10 },
    });
    assert.equal(display.price, 25);
    assert.equal(display.mrp, 30);
    assert.equal(display.unitLabel, "250 g");
    assert.equal(display.pricePerKg, 100);
    assert.equal(display.isMinWeight, true);
  });

  it("passes pack products through unchanged", () => {
    const display = catalogPriceDisplay({
      price: 45,
      mrp: 50,
      unit: "750 ml",
    });
    assert.equal(display.price, 45);
    assert.equal(display.mrp, 50);
    assert.equal(display.unitLabel, "750 ml");
    assert.equal(display.isMinWeight, false);
  });
});
