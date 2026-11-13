/**
 * F3 — Contratos de Pagamento (Stripe padrão).
 */
import { z } from 'zod';
import { uuidSchema } from './common';

export const paymentMethodSchema = z.enum([
  'CARD_CREDIT',
  'CARD_DEBIT',
  'PIX',
  'CASH',
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentGatewaySchema = z.enum([
  'STRIPE',
  'MERCADO_PAGO',
  'OFFLINE',
]);
export type PaymentGateway = z.infer<typeof paymentGatewaySchema>;

export const paymentStatusSchema = z.enum([
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'CANCELLED',
  'CHARGEBACK',
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const stripeCheckoutResponseSchema = z.object({
  paymentId: uuidSchema,
  clientSecret: z.string(),
  publishableKey: z.string().optional(),
  amountCents: z.number().int(),
  currency: z.literal('brl'),
  status: paymentStatusSchema,
});
export type StripeCheckoutResponse = z.infer<typeof stripeCheckoutResponseSchema>;

export const paymentViewSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  method: paymentMethodSchema,
  gateway: paymentGatewaySchema,
  status: paymentStatusSchema,
  amountCents: z.number().int(),
  clientSecret: z.string().nullable().optional(),
  cardBrand: z.string().nullable().optional(),
  cardLast4: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type PaymentView = z.infer<typeof paymentViewSchema>;
