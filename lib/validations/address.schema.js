import { z } from 'zod';
import { indianMobileSchema } from './auth.schema';

export const addressFieldsSchema = z.object({
  line1: z.string().trim().min(1, 'Building / apartment is required'),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  /** Optional — matches storefront backend; customer may leave blank. */
  city: z.string().trim().optional(),
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
