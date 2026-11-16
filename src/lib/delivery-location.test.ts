import assert from "node:assert/strict";
import test from "node:test";
import {
  askUntilLocation,
  deliveryAreaBlock,
  isLatLng,
} from "./delivery-location.ts";

test("accepts only a real latitude and longitude", () => {
  assert.equal(isLatLng(null), false);
  assert.equal(isLatLng({}), false);
  assert.equal(isLatLng({ lat: Number.NaN, lng: 77 }), false);
  assert.equal(isLatLng({ lat: 91, lng: 0 }), false);
  assert.equal(isLatLng({ lat: 0, lng: 181 }), false);
  assert.equal(isLatLng({ lat: 12.97, lng: 77.59 }), true);
});

test("keeps asking until a pin is returned", async () => {
  let calls = 0;
  const point = await askUntilLocation(async () => {
    calls += 1;
    if (calls < 3) return null;
    return { lat: 12.91, lng: 77.64 };
  }, 3);
  assert.equal(calls, 3);
  assert.deepEqual(point, { lat: 12.91, lng: 77.64 });
});

test("stops asking after the attempt budget", async () => {
  let calls = 0;
  const point = await askUntilLocation(async () => {
    calls += 1;
    return null;
  }, 3);
  assert.equal(calls, 3);
  assert.equal(point, null);
});

test("ignores an invented or out-of-range pin and asks again", async () => {
  const reads = [
    { lat: 400, lng: 10 },
    { lat: 12.9, lng: 77.5 },
  ];
  const point = await askUntilLocation(async () => reads.shift() ?? null, 3);
  assert.deepEqual(point, { lat: 12.9, lng: 77.5 });
});

test("blocks checkout when the shop does not deliver", () => {
  assert.equal(deliveryAreaBlock({ serviceable: true }), null);
  assert.match(deliveryAreaBlock({ serviceable: false }) ?? "", /don't deliver/i);
  assert.match(deliveryAreaBlock(null) ?? "", /couldn't check/i);
  assert.match(deliveryAreaBlock({}) ?? "", /couldn't check/i);
});
