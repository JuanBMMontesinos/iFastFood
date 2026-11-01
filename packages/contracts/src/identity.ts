/**
 * Contratos de identidade (F1): cliente, parceiro, entregador e staff.
 * Personas compartilham a tabela `users` (ver prisma/schema.prisma).
 */
import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema, phoneBrSchema } from './common';

// ---- Sessão / tokens -------------------------------------------------------
export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessExpiresIn: z.number().int().positive(), // segundos
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

// ---- Cliente ---------------------------------------------------------------
export const customerSignupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneBrSchema,
    password: passwordSchema,
  })
  .strict();
export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;

export const customerSignupResponseSchema = z.object({
  userId: z.string().uuid(),
  pendingPhoneVerification: z.boolean(),
});
export type CustomerSignupResponse = z.infer<typeof customerSignupResponseSchema>;

// ---- Login -----------------------------------------------------------------
export const loginSchema = z
  .object({
    emailOrPhone: z.string().min(5).max(254),
    password: z.string().min(1).max(72),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

// ---- OTP (telefone) --------------------------------------------------------
export const otpRequestSchema = z.object({ phone: phoneBrSchema }).strict();
export const otpVerifySchema = z
  .object({
    phone: phoneBrSchema,
    code: z.string().regex(/^\d{6}$/, 'Código OTP deve ter 6 dígitos'),
  })
  .strict();

// ---- Endereços do cliente --------------------------------------------------
export const addressInputSchema = z
  .object({
    label: z.string().trim().max(60).optional(),
    street: z.string().trim().min(1).max(200),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(200).optional().nullable(),
    district: z.string().trim().min(1).max(120),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().min(2).max(2).toUpperCase(), // UF
    zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter 8 dígitos (00000-000)'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    isDefault: z.boolean().optional().default(false),
  })
  .strict();
export type AddressInput = z.infer<typeof addressInputSchema>;
