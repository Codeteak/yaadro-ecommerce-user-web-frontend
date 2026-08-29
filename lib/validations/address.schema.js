import { z } from 'zod';
import { indianMobileSchema } from './auth.schema';

export const addressFieldsSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  postalCode: z
    .string()
    .trim()
    .min(1, 'PIN code is required')
    .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN'),
  country: z.string().optional(),
  label: z.string().optional(),
});

export function validateAddressCheckoutForm({
  form,
  needsNameField,
  needsPhoneField,
  nameDraft,
  phoneDraft,
  nameFromAddress,
  phoneFromAddress,
  phoneFromProfile,
}) {
  const errors = {};

  const fieldsResult = addressFieldsSchema.safeParse(form);
  if (!fieldsResult.success) {
    for (const issue of fieldsResult.error.issues) {
      const key = issue.path[0];
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }

  if (needsNameField) {
    const name = (nameDraft || nameFromAddress || '').trim();
    if (!name || name.length < 2) errors.name = 'Enter your full name';
  }

  if (needsPhoneField) {
    const phoneResult = indianMobileSchema.safeParse(phoneDraft || phoneFromAddress || '');
    if (!phoneResult.success) {
      errors.phone = phoneResult.error.issues[0]?.message || 'Enter a valid mobile number';
    }
  } else {
    const phoneResult = indianMobileSchema.safeParse(phoneFromProfile || '');
    if (!phoneResult.success) {
      errors.phone = 'Update your phone in profile';
    }
  }

  return { errors, ok: Object.keys(errors).length === 0 };
}
