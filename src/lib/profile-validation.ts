/**
 * Profile form rules — mirror the shop's checks so errors show before a request.
 * Backend: name max 120; phone normalised to 10 digits; OTP exactly 4 digits.
 */

import { z } from "zod";

export const FULL_NAME_MAX = 120;
export const OTP_LENGTH = 4;
/** Shop resend cooldown for phone-change codes. */
export const PHONE_OTP_RESEND_SECONDS = 60;

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

export const PROFILE_MESSAGES = {
  nameRequired: "Enter your full name.",
  nameShort: "Name needs at least 2 letters.",
  nameLong: `Name is too long (max ${FULL_NAME_MAX} characters).`,
  nameLetters: "Use letters, spaces, dots, apostrophes or hyphens only.",
  nameUnchanged: "That's already your name.",
  phoneInvalid: "Enter a valid 10-digit mobile number.",
  phoneSame: "This is already your number.",
  otpInvalid: `Enter the ${OTP_LENGTH}-digit code.`,
} as const;

/** Collapse inner spaces and trim — what we send and compare. */
export function normalizeFullName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Indian mobile → 10 digits starting 6–9, or null.
 * Accepts `+91 98765 43210`, `919876543210`, `09876543210`, `9876543210`.
 */
export function normalizeIndianMobile(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Digits only, capped at the OTP length — for the code input. */
export function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function formatIndianMobile(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = normalizeIndianMobile(value);
  if (!digits) return value;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export const fullNameSchema = z
  .string()
  .transform(normalizeFullName)
  .pipe(
    z
      .string()
      .min(1, PROFILE_MESSAGES.nameRequired)
      .min(2, PROFILE_MESSAGES.nameShort)
      .max(FULL_NAME_MAX, PROFILE_MESSAGES.nameLong)
      .regex(NAME_PATTERN, PROFILE_MESSAGES.nameLetters),
  );

export function profileNameFormSchema(currentName: string | null) {
  const current = normalizeFullName(currentName ?? "");
  return z.object({
    fullName: fullNameSchema.refine((value) => value !== current, {
      message: PROFILE_MESSAGES.nameUnchanged,
    }),
  });
}

export function phoneChangeFormSchema(currentPhone: string | null) {
  const current = currentPhone ? normalizeIndianMobile(currentPhone) : null;
  return z.object({
    phone: z
      .string()
      .transform((value, ctx) => {
        const digits = normalizeIndianMobile(value);
        if (!digits) {
          ctx.addIssue({ code: "custom", message: PROFILE_MESSAGES.phoneInvalid });
          return z.NEVER;
        }
        return digits;
      })
      .refine((digits) => digits !== current, {
        message: PROFILE_MESSAGES.phoneSame,
      }),
  });
}

export const otpFormSchema = z.object({
  code: z
    .string()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), PROFILE_MESSAGES.otpInvalid),
});

/**
 * Only the changed fields go to PATCH /api/me/profile.
 * Returns null when nothing changed (skip the request).
 */
export function profileNamePatch(
  currentName: string | null,
  nextName: string,
): { name: string } | null {
  const next = normalizeFullName(nextName);
  if (!next || next === normalizeFullName(currentName ?? "")) return null;
  return { name: next };
}
