import assert from "node:assert/strict";
import test from "node:test";
import { PROFILE_OPTIONS, resolveProfileOption } from "./profile-options.ts";

function option(id: string) {
  const found = PROFILE_OPTIONS.find((o) => o.id === id);
  assert.ok(found);
  return found;
}

test("guests can open wishlist and support only", () => {
  const open = PROFILE_OPTIONS.filter(
    (o) => resolveProfileOption(o, false).kind !== "login",
  ).map((o) => o.id);
  assert.deepEqual(open, ["wishlist", "support"]);
});

test("guest taps on locked rows go to login and come back", () => {
  assert.deepEqual(resolveProfileOption(option("orders"), false), {
    kind: "login",
    href: "/login?next=%2Forders",
  });
  assert.deepEqual(resolveProfileOption(option("addresses"), false), {
    kind: "login",
    href: "/login?next=%2Fprofile%3Faddress%3D1",
  });
});

test("signed-in shoppers get links, and addresses open the sheet", () => {
  assert.deepEqual(resolveProfileOption(option("coupons"), true), {
    kind: "link",
    href: "/coupons",
  });
  assert.deepEqual(resolveProfileOption(option("addresses"), true), { kind: "sheet" });
});
