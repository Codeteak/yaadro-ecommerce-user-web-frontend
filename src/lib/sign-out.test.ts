import assert from "node:assert/strict";
import test from "node:test";
import { clearSignedInUserData, type SignOutCleanupDeps } from "./sign-out.ts";

function recorder(failOn?: keyof SignOutCleanupDeps) {
  const calls: string[] = [];
  const step = (name: keyof SignOutCleanupDeps) => () => {
    calls.push(name);
    if (name === failOn) throw new Error("storage blocked");
  };
  const deps: SignOutCleanupDeps = {
    clearSession: step("clearSession"),
    clearQueryCache: step("clearQueryCache"),
    clearCouponPromo: step("clearCouponPromo"),
    clearSavedAddresses: step("clearSavedAddresses"),
    clearDeliveryAddress: step("clearDeliveryAddress"),
    clearProfileCache: step("clearProfileCache"),
    markLoginReset: step("markLoginReset"),
  };
  return { calls, deps };
}

test("clears every per-user store, session first", () => {
  const { calls, deps } = recorder();
  const result = clearSignedInUserData(deps);
  assert.deepEqual(result.failed, []);
  assert.equal(calls[0], "clearSession");
  assert.equal(calls.length, 7);
});

test("one failing store does not stop the rest", () => {
  const { calls, deps } = recorder("clearSavedAddresses");
  const result = clearSignedInUserData(deps);
  assert.deepEqual(result.failed, ["clearSavedAddresses"]);
  assert.ok(calls.includes("clearDeliveryAddress"));
  assert.ok(calls.includes("markLoginReset"));
});
