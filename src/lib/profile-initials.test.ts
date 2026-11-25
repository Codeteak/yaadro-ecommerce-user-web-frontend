import assert from "node:assert/strict";
import test from "node:test";
import { profileInitials } from "./profile-initials.ts";

test("two-word names use first and last initials", () => {
  assert.equal(profileInitials("Priya Nair"), "PN");
  assert.equal(profileInitials("  K. R. D'Souza  "), "KD");
});

test("single word uses the first two letters", () => {
  assert.equal(profileInitials("Arun"), "AR");
});

test("empty name falls back to Y", () => {
  assert.equal(profileInitials(null), "Y");
  assert.equal(profileInitials("   "), "Y");
});
