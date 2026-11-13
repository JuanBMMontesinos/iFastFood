/**
 * Contratos de parceiros (F2): onboarding, perfil, KYC, horários,
 * áreas de entrega, equipe e revisão administrativa.
 */
import { z } from 'zod';
import {
  cnpjSchema,
  emailSchema,
  moneyCentsSchema,
  nameSchema,
  passwordSchema,
  phoneBrSchema,
  uuidSchema,
} from './common';
import { tokenPairSchema } from './identity';

// ---- Enums (espelham o schema Prisma) --------------------------------------
export const merchantPlanSchema = z.enum(['BASIC', 'DELIVERY']);
export const merchantStatusSchema = z.enum([
  'ONBOARDING',
  'PENDING_REVIEW',
  'ACTIVE',
  'PAUSED',
  'BLOCKED',
  'CLOSED',
]);
export const merchantStaffRoleSchema = z.enum(['OWNER', 'MANAGER', 'OPERATOR']);
export const merchantDocumentTypeSchema = z.enum(['CNPJ_CARD', 'SOCIAL_CONTRACT', 'ID_CARD']);
export const deliveryZoneTypeSchema = z.enum(['RADIUS', 'POLYGON']);

// ---- Cadastro público ------------------------------------------------------
export const merchantSignupSchema = z
  .object({
    /** Dono/responsável (vira usuário STAFF com papel OWNER). */
    ownerName: nameSchema,
    email: emailSchema,
    phone: phoneBrSchema,
    password: passwordSchema,
    /** Dados da loja (editáveis depois no perfil). */
    merchantName: nameSchema,
    categoryId: uuidSchema,
    description: z.string().trim().max(500).optional(),
    /** CNPJ validado por dígito verificador; cifrado em repouso. */
    cnpj: cnpjSchema,
    acceptedLgpd: z.literal(true, {
      errorMap: () => ({ message: 'É necessário aceitar os termos (LGPD) para continuar' }),
    }),
  })
  .strict();
export type MerchantSignupInput = z.infer<typeof merchantSignupSchema>;

export const merchantSignupResponseSchema = tokenPairSchema.extend({
  merchantId: uuidSchema,
  status: merchantStatusSchema,
});
export type MerchantSignupResponse = z.infer<typeof merchantSignupResponseSchema>;

// ---- Perfil (self-service do parceiro) --------------------------------------
export const merchantProfileUpdateSchema = z
  .object({
    merchantName: nameSchema.optional(),
    categoryId: uuidSchema.optional(),
    description: z.string().trim().max(500).optional(),
    email: emailSchema.optional(),
    phone: phoneBrSchema.optional(),
    logoUrl: z.string().url().max(500).optional(),
    coverUrl: z.string().url().max(500).optional(),
    orderPrepMinutes: z.number().int().min(5).max(180).optional(),
    address: z
      .object({
        street: z.string().trim().min(3).max(120),
        number: z.string().trim().min(1).max(10),
        complement: z.string().trim().max(60).optional(),
        district: z.string().trim().min(2).max(60),
        city: z.string().trim().min(2).max(60),
        state: z.string().trim().length(2).toUpperCase(),
        zipCode: z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
        lat: z.number().min(-33).max(6),
        lng: z.number().min(-75).max(-30),
      })
      .strict()
      .optional(),
  })
  .strict();
export type MerchantProfileUpdateInput = z.infer<typeof merchantProfileUpdateSchema>;

// ---- Horários ---------------------------------------------------------------
export const businessHourSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    /** '10:30' — validação por cadeia; serializa em minutos internamente. */
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();
export type BusinessHourInput = z.infer<typeof businessHourSchema>;

/** Substituição completa (upsert all) das janelas semanais. */
export const businessHoursSetSchema = z
  .object({
    hours: z.array(businessHourSchema).min(1).max(50),
  })
  .strict();
export type BusinessHoursSetInput = z.infer<typeof businessHoursSetSchema>;

// ---- Áreas de entrega --------------------------------------------------------
const latLngSchema = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);

const deliveryZoneBase = z
  .object({
    name: z.string().trim().min(2).max(60),
    type: deliveryZoneTypeSchema.default('RADIUS'),
    baseFeeCents: moneyCentsSchema,
    perKmCents: moneyCentsSchema,
    minFeeCents: moneyCentsSchema,
    maxKm: z.number().min(0.1).max(50).optional(),
    minOrderCents: moneyCentsSchema.default(0),
    etaMinMinutes: z.number().int().min(5).max(180).optional(),
    etaMaxMinutes: z.number().int().min(5).max(240).optional(),
    /** Obrigatório quando type=POLYGON (>= 3 vértices). */
    polygon: z.array(latLngSchema).min(3).max(1000).optional(),
  })
  .strict();

export const deliveryZoneInputSchema = deliveryZoneBase
  .refine(
    (z_) => z_.type !== 'POLYGON' || z_.polygon !== undefined,
    { message: 'Zona POLYGON exige polygon com >= 3 vértices' },
  );
export type DeliveryZoneInput = z.infer<typeof deliveryZoneInputSchema>;

// ---- KYC --------------------------------------------------------------------
export const kycDocumentSchema = z
  .object({
    type: merchantDocumentTypeSchema,
    fileUrl: z.string().url().max(500),
  })
  .strict();
export type KycDocumentInput = z.infer<typeof kycDocumentSchema>;

export const kycSubmitSchema = z
  .object({
    documents: z.array(kycDocumentSchema).min(3).max(3),
  })
  .strict();
export type KycSubmitInput = z.infer<typeof kycSubmitSchema>;

// ---- Equipe -----------------------------------------------------------------
export const partnerStaffInviteSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: merchantStaffRoleSchema.refine((r) => r !== 'OWNER', {
      message: 'OWNER só pode ser concedido pelo backoffice',
    }),
  })
  .strict();
export type PartnerStaffInviteInput = z.infer<typeof partnerStaffInviteSchema>;

export const partnerStaffRemoveSchema = z
  .object({ userId: uuidSchema })
  .strict();

// ---- Revisão administrativa --------------------------------------------------
export const partnerReviewSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT']),
    /** Obrigatório e contextual no REJECT. */
    rejectReason: z.string().trim().min(5).max(500).optional(),
  })
  .strict()
  .refine((v) => v.decision === 'APPROVE' || v.rejectReason !== undefined, {
    message: 'REJECT exige rejectReason',
  });
export type PartnerReviewInput = z.infer<typeof partnerReviewSchema>;

export const merchantContractUpsertSchema = z
  .object({
    plan: merchantPlanSchema,
    commissionBps: z.number().int().min(0).max(3000),
    onlinePaymentFeeBps: z.number().int().min(0).max(1000),
    monthlyFeeCents: moneyCentsSchema,
    feeFreeThresholdCents: moneyCentsSchema,
    commissionBasis: z.enum(['ITEMS', 'ITEMS_AND_DELIVERY']).default('ITEMS'),
  })
  .strict();
export type MerchantContractUpsertInput = z.infer<typeof merchantContractUpsertSchema>;

export const merchantStatusActionSchema = z
  .object({
    action: z.enum(['PAUSE', 'RESUME', 'BLOCK', 'UNBLOCK', 'CLOSE']),
  })
  .strict();
export type MerchantStatusActionInput = z.infer<typeof merchantStatusActionSchema>;

// ---- Views (respostas) --------------------------------------------------------

export const contractViewSchema = z.object({
  plan: merchantPlanSchema,
  commissionBps: z.number().int().min(0),
  onlinePaymentFeeBps: z.number().int().min(0),
  monthlyFeeCents: moneyCentsSchema,
  feeFreeThresholdCents: moneyCentsSchema,
  commissionBasis: z.enum(['ITEMS', 'ITEMS_AND_DELIVERY']),
  signedAt: z.string().min(1),
});
export type ContractView = z.infer<typeof contractViewSchema>;

export const kycDocumentViewSchema = z.object({
  type: merchantDocumentTypeSchema,
  fileUrl: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']),
  rejectReason: z.string().nullable(),
  reviewedAt: z.string().nullable(),
});
export type KycDocumentView = z.infer<typeof kycDocumentViewSchema>;

export const merchantDocumentViewSchema = kycDocumentViewSchema;

/** Perfil que o Portal do Parceiro consome em /partners/me. */
export const partnerProfileSchema = z.object({
  merchant: z.object({
    id: uuidSchema,
    name: z.string(),
    slug: z.string(),
    categoryId: uuidSchema,
    status: merchantStatusSchema,
    description: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    logoUrl: z.string().nullable(),
    coverUrl: z.string().nullable(),
    orderPrepMinutes: z.number().int().nullable(),
    address: z
      .object({
        street: z.string().nullable(),
        number: z.string().nullable(),
        complement: z.string().nullable(),
        district: z.string().nullable(),
        city: z.string().nullable(),
        state: z.string().nullable(),
        zipCode: z.string().nullable(),
        lat: z.number().nullable(),
        lng: z.number().nullable(),
      })
      .nullable(),
  }),
  contract: contractViewSchema.nullable(),
  staffRole: merchantStaffRoleSchema,
  kyc: z.object({
    submitted: z.array(kycDocumentViewSchema),
    /** true quando os 3 tipos obrigatórios estão APPROVED → apto a revisão. */
    complete: z.boolean(),
  }),
});
export type PartnerProfile = z.infer<typeof partnerProfileSchema>;

export const merchantAdminListItemSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  categoryId: uuidSchema,
  status: merchantStatusSchema,
  plan: merchantPlanSchema.nullable(),
  kycComplete: z.boolean(),
  createdAt: z.string(),
});
export type MerchantAdminListItem = z.infer<typeof merchantAdminListItemSchema>;

export const merchantAdminDetailSchema = partnerProfileSchema.extend({
  documents: z.array(merchantDocumentViewSchema),
});
export type MerchantAdminDetail = z.infer<typeof merchantAdminDetailSchema>;

export const deliveryZoneViewSchema = deliveryZoneBase
  .extend({ id: uuidSchema })
  .refine((v) => v.type !== 'POLYGON' || v.polygon !== undefined, {
    message: 'Zona POLYGON retorna polygon preenchido',
  });
export type DeliveryZoneView = z.infer<typeof deliveryZoneViewSchema>;
