import assert from "node:assert/strict";
import test from "node:test";
import {
  isOfferDhamakaSectionTitle,
  offerDhamakaCountLabel,
  offerDhamakaSeeAllLabel,
} from "./offer-dhamaka-title.ts";

test("isOfferDhamakaSectionTitle matches price-drop / special offers titles", () => {
  assert.equal(isOfferDhamakaSectionTitle("Special Offers"), true);
  assert.equal(isOfferDhamakaSectionTitle("Price Drop"), true);
  assert.equal(isOfferDhamakaSectionTitle("Weekend dhamaka"), true);
  assert.equal(isOfferDhamakaSectionTitle("Daily Dairy"), false);
  assert.equal(isOfferDhamakaSectionTitle("Festive"), false);
});

test("offerDhamakaSeeAllLabel caps at 10+", () => {
  assert.equal(offerDhamakaSeeAllLabel(0), "See all deals");
  assert.equal(offerDhamakaSeeAllLabel(1), "See all 1 deal");
  assert.equal(offerDhamakaSeeAllLabel(8), "See all 8 deals");
  assert.equal(offerDhamakaSeeAllLabel(10), "See all 10+ deals");
  assert.equal(offerDhamakaSeeAllLabel(12), "See all 10+ deals");
  assert.equal(offerDhamakaCountLabel(12), "10+ deals");
});
