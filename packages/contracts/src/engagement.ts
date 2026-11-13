import { z } from 'zod';

// ========================
// MARKETING & CUPONS
// ========================

export const couponTypeSchema = z.enum(['PERCENTAGE', 'FIXED', 'FREE_DELIVERY']);
export type CouponType = z.infer<typeof couponTypeSchema>;

export const validateCouponInputSchema = z.object({
  code: z.string().trim().min(3).max(30),
  orderItemsCents: z.number().int().nonnegative(),
  merchantId: z.string().uuid().optional(),
});
export type ValidateCouponInput = z.infer<typeof validateCouponInputSchema>;

export const couponValidationResultSchema = z.object({
  valid: z.boolean(),
  discountCents: z.number().int().nonnegative(),
  message: z.string().optional(),
  coupon: z
    .object({
      id: z.string(),
      code: z.string(),
      type: couponTypeSchema,
    })
    .optional(),
});
export type CouponValidationResult = z.infer<typeof couponValidationResultSchema>;

// ========================
// AVALIAÇÕES (RATINGS)
// ========================

export const createRatingInputSchema = z.object({
  orderId: z.string().uuid(),
  merchantRating: z.number().int().min(1).max(5).optional(),
  courierRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(500).optional(),
});
export type CreateRatingInput = z.infer<typeof createRatingInputSchema>;

export const ratingViewSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  merchantRating: z.number().nullable().optional(),
  courierRating: z.number().nullable().optional(),
  comment: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type RatingView = z.infer<typeof ratingViewSchema>;

// ========================
// SUPORTE (TICKETS)
// ========================

export const ticketPersonaSchema = z.enum(['CUSTOMER', 'MERCHANT', 'COURIER']);
export type TicketPersona = z.infer<typeof ticketPersonaSchema>;

export const ticketStatusSchema = z.enum([
  'OPEN',
  'ASSIGNED',
  'WAITING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const createTicketInputSchema = z.object({
  persona: ticketPersonaSchema,
  subject: z.string().trim().min(5).max(120),
  orderId: z.string().uuid().optional(),
  message: z.string().trim().min(5).max(2000),
});
export type CreateTicketInput = z.infer<typeof createTicketInputSchema>;

export const ticketViewSchema = z.object({
  id: z.string(),
  persona: ticketPersonaSchema,
  subject: z.string(),
  status: ticketStatusSchema,
  orderId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TicketView = z.infer<typeof ticketViewSchema>;
