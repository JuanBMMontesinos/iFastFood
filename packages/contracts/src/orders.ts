/**
 * F3 — Contratos de Pedidos (Orders): Checkout, Máquina de Estados e Gestor.
 */
import { z } from 'zod';
import { moneyCentsSchema, uuidSchema } from './common';
import { paymentMethodSchema, paymentStatusSchema } from './payments';

export const orderStatusSchema = z.enum([
  'CREATED',
  'PENDING_ACCEPTANCE',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'IN_PREPARATION',
  'READY_FOR_PICKUP',
  'DISPATCHED',
  'IN_DELIVERY',
  'DELIVERED',
  'CANCELED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderItemOptionInputSchema = z.object({
  groupName: z.string().trim().min(1).max(60),
  optionName: z.string().trim().min(1).max(60),
  priceDeltaCents: z.number().int().min(0).default(0),
});
export type OrderItemOptionInput = z.infer<typeof orderItemOptionInputSchema>;

export const orderItemInputSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(200).optional(),
  options: z.array(orderItemOptionInputSchema).default([]),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const orderCheckoutInputSchema = z.object({
  merchantId: uuidSchema,
  deliveryAddressId: uuidSchema,
  items: z.array(orderItemInputSchema).min(1, 'Pedido deve conter pelo menos 1 item'),
  paymentMethod: paymentMethodSchema,
  couponCode: z.string().trim().toUpperCase().optional(),
  notes: z.string().trim().max(300).optional(),
});
export type OrderCheckoutInput = z.infer<typeof orderCheckoutInputSchema>;

export const orderCheckoutResponseSchema = z.object({
  orderId: uuidSchema,
  code: z.string(),
  status: orderStatusSchema,
  totalCents: moneyCentsSchema,
  itemsTotalCents: moneyCentsSchema,
  deliveryFeeCents: moneyCentsSchema,
  serviceFeeCents: moneyCentsSchema,
  discountCents: moneyCentsSchema,
  stripeClientSecret: z.string().nullable().optional(),
});
export type OrderCheckoutResponse = z.infer<typeof orderCheckoutResponseSchema>;

export const orderStatusActionSchema = z.object({
  action: z.enum([
    'ACCEPT',
    'REJECT',
    'PREPARE',
    'READY',
    'DISPATCH',
    'DELIVER',
    'CANCEL',
  ]),
  reason: z.string().trim().max(300).optional(),
});
export type OrderStatusActionInput = z.infer<typeof orderStatusActionSchema>;

export const orderEventViewSchema = z.object({
  id: uuidSchema,
  fromStatus: z.string().nullable(),
  toStatus: z.string(),
  actorType: z.string(),
  actorUserId: z.string().nullable(),
  createdAt: z.string(),
});
export type OrderEventView = z.infer<typeof orderEventViewSchema>;

export const orderItemViewSchema = z.object({
  id: uuidSchema,
  productId: z.string().nullable(),
  productName: z.string(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int(),
  itemTotalCents: z.number().int(),
  notes: z.string().nullable(),
  options: z.array(
    z.object({
      id: uuidSchema,
      groupName: z.string().nullable(),
      optionName: z.string(),
      priceDeltaCents: z.number().int(),
    }),
  ),
});
export type OrderItemView = z.infer<typeof orderItemViewSchema>;

export const orderDetailViewSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  status: orderStatusSchema,
  merchant: z.object({
    id: uuidSchema,
    name: z.string(),
    phone: z.string().nullable(),
    logoUrl: z.string().nullable(),
  }),
  deliveryAddress: z
    .object({
      street: z.string(),
      number: z.string(),
      complement: z.string().nullable(),
      district: z.string(),
      city: z.string(),
      state: z.string(),
    })
    .nullable(),
  items: z.array(orderItemViewSchema),
  events: z.array(orderEventViewSchema),
  paymentMethod: paymentMethodSchema,
  itemsTotalCents: z.number().int(),
  deliveryFeeCents: z.number().int(),
  serviceFeeCents: z.number().int(),
  discountCents: z.number().int(),
  totalCents: z.number().int(),
  placedAt: z.string(),
  confirmedAt: z.string().nullable(),
  readyAt: z.string().nullable(),
  dispatchedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
});
export type OrderDetailView = z.infer<typeof orderDetailViewSchema>;
