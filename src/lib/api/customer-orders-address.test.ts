import assert from "node:assert/strict";
import test from "node:test";
import { addressLabel } from "./order-address.ts";

test("addressLabel uses line1 and remaining parts", () => {
  assert.deepEqual(
    addressLabel({
      line1: "12 Palm Grove",
      line2: "MG Road",
      landmark: "Near park",
      city: "Bengaluru",
    }),
    {
      label: "12 Palm Grove",
      detail: "MG Road, Near park, Bengaluru",
    },
  );
});

test("addressLabel falls back to raw when lines are empty", () => {
  assert.deepEqual(addressLabel({ raw: "Flat 4B, Lake View, Kochi" }), {
    label: "Flat 4B",
    detail: "Lake View, Kochi",
  });
});

test("addressLabel parses JSON string payloads", () => {
  assert.deepEqual(
    addressLabel(
      JSON.stringify({ line1: "Office", city: "Chennai", raw: "Office, Chennai" }),
    ),
    {
      label: "Office",
      detail: "Chennai",
    },
  );
});

test("addressLabel returns placeholder when empty", () => {
  assert.deepEqual(addressLabel(null), {
    label: "Delivery address",
    detail: "",
  });
});
