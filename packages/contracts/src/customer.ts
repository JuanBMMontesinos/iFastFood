/**
 * F3 — Contratos do Cliente (Customer): perfil e endereços de entrega.
 */
import { z } from 'zod';
import { nameSchema, phoneBrSchema, uuidSchema } from './common';
import { addressInputSchema, type AddressInput } from './identity';

export { addressInputSchema, type AddressInput };

export const customerProfileUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneBrSchema.optional(),
  })
  .strict();
export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;

export const addressViewSchema = z.object({
  id: uuidSchema,
  label: z.string().nullable(),
  street: z.string(),
  number: z.string(),
  complement: z.string().nullable(),
  district: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  lat: z.number(),
  lng: z.number(),
  isDefault: z.boolean(),
  createdAt: z.string(),
});
export type AddressView = z.infer<typeof addressViewSchema>;

export const customerProfileSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  addresses: z.array(addressViewSchema),
});
export type CustomerProfileView = z.infer<typeof customerProfileSchema>;
