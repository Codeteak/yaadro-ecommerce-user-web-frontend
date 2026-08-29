import { z } from 'zod';

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const indianMobileSchema = z
  .string()
  .trim()
  .min(1, 'Enter your 10-digit mobile number')
  .length(10, 'Enter a complete 10-digit mobile number')
  .regex(INDIAN_MOBILE_REGEX, 'Enter a valid Indian mobile number');

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, 'Enter the OTP from your SMS (4–8 digits).');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

export const loginPhoneSchema = z.object({
  phone: indianMobileSchema,
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  phone: indianMobileSchema,
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** First Zod issue message, or null when parse succeeded. */
export function firstZodIssueMessage(result) {
  if (result.success) return null;
  return result.error.issues[0]?.message || null;
}

/** Validate sanitized 10-digit phone for login submit. Returns error string or null. */
export function validateLoginPhone(digits) {
  return firstZodIssueMessage(loginPhoneSchema.safeParse({ phone: digits }));
}
