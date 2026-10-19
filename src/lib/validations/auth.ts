import { z } from "zod";

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const indianMobileSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Enter digits only")
  .length(10, "Enter a complete 10-digit mobile number")
  .regex(INDIAN_MOBILE_REGEX, "Enter a valid Indian mobile number");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Enter the 4-digit OTP");

export const loginPhoneSchema = z.object({
  phone: indianMobileSchema,
});

export function firstZodIssueMessage(
  result: z.ZodSafeParseResult<unknown>,
): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? null;
}

export function validateLoginPhone(digits: string): string | null {
  return firstZodIssueMessage(loginPhoneSchema.safeParse({ phone: digits }));
}

export function validateOtp(code: string): string | null {
  return firstZodIssueMessage(otpSchema.safeParse(code));
}
