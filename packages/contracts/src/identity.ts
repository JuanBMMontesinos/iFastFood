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
    /** Consentimento LGPD obrigatório ( termos de uso + política de privacidade ). */
    acceptedLgpd: z.literal(true, {
      errorMap: () => ({ message: 'É necessário aceitar os termos (LGPD) para criar a conta' }),
    }),
  })
  .strict();
export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;

export const customerSignupResponseSchema = z.object({
  userId: z.string().uuid(),
  pendingPhoneVerification: z.boolean(),
  /** Apenas fora de produção: expõe o código para testar o fluxo sem SMS. */
  devCode: z.string().regex(/^\d{6}$/).optional(),
});
export type CustomerSignupResponse = z.infer<typeof customerSignupResponseSchema>;

// ---- Login -----------------------------------------------------------------
export const loginSchema = z
  .object({
    emailOrPhone: z.string().min(5).max(254),
    password: z.string().min(1).max(72),
    /** TOTP quando o usuário tem 2FA ativo (equipe do backoffice). */
    totp: z
      .string()
      .regex(/^\d{6}$/, 'Código TOTP deve ter 6 dígitos')
      .optional(),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const twoFactorRequiredResponseSchema = z.object({
  twoFactorRequired: z.literal(true),
});
export type TwoFactorRequiredResponse = z.infer<typeof twoFactorRequiredResponseSchema>;

export const loginResponseSchema = z.union([
  tokenPairSchema,
  twoFactorRequiredResponseSchema,
]);
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ---- OTP (telefone) --------------------------------------------------------
export const otpRequestSchema = z.object({ phone: phoneBrSchema }).strict();
export const otpVerifySchema = z
  .object({
    phone: phoneBrSchema,
    code: z.string().regex(/^\d{6}$/, 'Código OTP deve ter 6 dígitos'),
  })
  .strict();
export const otpVerifyResponseSchema = z.object({
  verified: z.literal(true),
  userId: z.string().uuid(),
  tokens: tokenPairSchema.optional(),
});
export type OtpVerifyResponse = z.infer<typeof otpVerifyResponseSchema>;

// ---- 2FA (TOTP) ------------------------------------------------------------
export const totpCodeSchema = z
  .object({ code: z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos') })
  .strict();
export const totpSetupResponseSchema = z.object({
  secret: z.string().min(16),
  otpauthUri: z.string().startsWith('otpauth://totp/'),
});
export type TotpSetupResponse = z.infer<typeof totpSetupResponseSchema>;

// ---- Perfil ----------------------------------------------------------------
export const meResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  userType: z.string(),
  status: z.string(),
  twoFactorEnabled: z.boolean(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

// ---- Admin (backoffice): gestão de usuários da equipe ------------------------
export const adminCreateStaffSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    roleName: z.string().min(2).max(40),
  })
  .strict();
export type AdminCreateStaffInput = z.infer<typeof adminCreateStaffSchema>;

export const adminUserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  userType: z.string(),
  status: z.string(),
  roleNames: z.array(z.string()),
  createdAt: z.string(),
});
export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>;

export const roleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
});
export type RoleResponse = z.infer<typeof roleResponseSchema>;

// ---- LGPD (DSAR) -------------------------------------------------------------
export const anonymizeSelfSchema = z
  .object({
    password: z.string().min(1).max(72),
    /** Exigido quando o usuário tem 2FA ativo. */
    totp: z.string().regex(/^\d{6}$/).optional(),
  })
  .strict();
export type AnonymizeSelfInput = z.infer<typeof anonymizeSelfSchema>;

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
