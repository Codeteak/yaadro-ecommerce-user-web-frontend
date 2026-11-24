import assert from "node:assert/strict";
import test from "node:test";
import {
  FULL_NAME_MAX,
  PROFILE_MESSAGES,
  formatIndianMobile,
  normalizeFullName,
  normalizeIndianMobile,
  otpFormSchema,
  phoneChangeFormSchema,
  profileNameFormSchema,
  profileNamePatch,
  sanitizeOtpInput,
} from "./profile-validation.ts";

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error?.issues[0]?.message ?? null;
}

test("full name trims, collapses spaces, and enforces the shop limits", () => {
  const schema = profileNameFormSchema("Old Name");
  const ok = schema.safeParse({ fullName: "  Priya   Nair " });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.fullName, "Priya Nair");

  assert.equal(firstError(schema.safeParse({ fullName: "   " })), PROFILE_MESSAGES.nameRequired);
  assert.equal(firstError(schema.safeParse({ fullName: "A" })), PROFILE_MESSAGES.nameShort);
  assert.equal(
    firstError(schema.safeParse({ fullName: "a".repeat(FULL_NAME_MAX + 1) })),
    PROFILE_MESSAGES.nameLong,
  );
  assert.equal(firstError(schema.safeParse({ fullName: "Priya123" })), PROFILE_MESSAGES.nameLetters);
  assert.equal(firstError(schema.safeParse({ fullName: "old  name" })), null);
  assert.equal(
    firstError(schema.safeParse({ fullName: " Old Name " })),
    PROFILE_MESSAGES.nameUnchanged,
  );
});

test("names in Indian scripts and with initials are accepted", () => {
  const schema = profileNameFormSchema(null);
  assert.equal(schema.safeParse({ fullName: "അനു മോൾ" }).success, true);
  assert.equal(schema.safeParse({ fullName: "K. R. D'Souza-Nair" }).success, true);
});

test("Indian mobile numbers normalise to 10 digits", () => {
  assert.equal(normalizeIndianMobile("+91 98765 43210"), "9876543210");
  assert.equal(normalizeIndianMobile("919876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("09876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("5876543210"), null);
  assert.equal(normalizeIndianMobile("98765"), null);
  assert.equal(formatIndianMobile("9876543210"), "+91 98765 43210");
});

test("phone change rejects invalid and current numbers", () => {
  const schema = phoneChangeFormSchema("+919876543210");
  assert.equal(firstError(schema.safeParse({ phone: "12345" })), PROFILE_MESSAGES.phoneInvalid);
  assert.equal(firstError(schema.safeParse({ phone: "98765 43210" })), PROFILE_MESSAGES.phoneSame);
  const ok = schema.safeParse({ phone: "+91 91234 56789" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.phone, "9123456789");
});

test("OTP must be exactly four digits and input strips letters", () => {
  assert.equal(otpFormSchema.safeParse({ code: "1234" }).success, true);
  assert.equal(firstError(otpFormSchema.safeParse({ code: "12a4" })), PROFILE_MESSAGES.otpInvalid);
  assert.equal(sanitizeOtpInput("1a2b3c4d5"), "1234");
});

test("name patch only includes a changed, non-empty name", () => {
  assert.equal(profileNamePatch("Priya Nair", " Priya  Nair "), null);
  assert.equal(profileNamePatch("Priya", ""), null);
  assert.deepEqual(profileNamePatch(null, "Arun K"), { name: "Arun K" });
  assert.equal(normalizeFullName("  a   b "), "a b");
});
