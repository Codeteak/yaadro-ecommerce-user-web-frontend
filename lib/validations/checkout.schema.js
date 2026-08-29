import { z } from 'zod';
import { addressFieldsSchema } from './address.schema';

export const checkoutAddressSchema = addressFieldsSchema;

export const checkoutPaymentSchema = z.object({
  paymentMethod: z.enum(['cod']),
});

export const checkoutFormSchema = z.object({
  address: checkoutAddressSchema,
  paymentMethod: checkoutPaymentSchema.shape.paymentMethod,
});
