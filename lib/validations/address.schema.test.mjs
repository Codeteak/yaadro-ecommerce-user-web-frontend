/**
 * Run: node --test lib/validations/address.schema.test.mjs
 * Mirrors addressFieldsSchema in address.schema.js (line1 required; city optional).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

const addressFieldsSchema = z.object({
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().trim().optional(),
  label: z.string().optional(),
});

test('addressFieldsSchema requires line1 only', () => {
  const ok = addressFieldsSchema.safeParse({
    line1: '12 Hill Road',
  });
  assert.equal(ok.success, true);

  const withCity = addressFieldsSchema.safeParse({
    line1: '12 Hill Road',
    city: 'Mumbai',
  });
  assert.equal(withCity.success, true);

  const missingLine1 = addressFieldsSchema.safeParse({ city: 'Mumbai' });
  assert.equal(missingLine1.success, false);

  const line1Only = addressFieldsSchema.safeParse({ line1: '12 Hill' });
  assert.equal(line1Only.success, true);
});

test('addressFieldsSchema does not require state or PIN', () => {
  const result = addressFieldsSchema.safeParse({
    line1: '12 Hill',
    city: 'Pune',
    line2: '',
    landmark: '',
  });
  assert.equal(result.success, true);
  assert.equal('state' in (result.data || {}), false);
  assert.equal('postalCode' in (result.data || {}), false);
  assert.equal('country' in (result.data || {}), false);
});

test('valid address without city is accepted', () => {
  const result = addressFieldsSchema.safeParse({
    line1: 'Flat 2',
    landmark: 'Near park',
  });
  assert.equal(result.success, true);
});
