import { z } from 'zod';

export const payoutStatusSchema = z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED']);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

export const ledgerSideSchema = z.enum(['DEBIT', 'CREDIT']);
export type LedgerSide = z.infer<typeof ledgerSideSchema>;

export const ledgerAccountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE']);
export type LedgerAccountType = z.infer<typeof ledgerAccountTypeSchema>;

export const payoutItemDtoSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderCode: z.string(),
  orderItemsCents: z.number(),
  orderDeliveryCents: z.number(),
  commissionCents: z.number(),
  processingFeeCents: z.number(),
  netCents: z.number(),
});
export type PayoutItemDto = z.infer<typeof payoutItemDtoSchema>;

export const payoutDtoSchema = z.object({
  id: z.string(),
  merchantId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  grossCents: z.number(),
  commissionCents: z.number(),
  processingFeeCents: z.number(),
  monthlyFeeCents: z.number(),
  netCents: z.number(),
  status: payoutStatusSchema,
  paidAt: z.string().nullable().optional(),
  items: z.array(payoutItemDtoSchema).default([]),
});
export type PayoutDto = z.infer<typeof payoutDtoSchema>;

export const courierEarningsDtoSchema = z.object({
  courierId: z.string(),
  totalDeliveries: z.number(),
  totalEarningsCents: z.number(),
  recentDeliveries: z.array(
    z.object({
      deliveryId: z.string(),
      orderCode: z.string(),
      distanceKm: z.number(),
      feeCourierCents: z.number(),
      deliveredAt: z.string(),
    }),
  ),
});
export type CourierEarningsDto = z.infer<typeof courierEarningsDtoSchema>;

export const ledgerEntryDtoSchema = z.object({
  id: z.string(),
  accountCode: z.string(),
  accountName: z.string(),
  side: ledgerSideSchema,
  amountCents: z.number(),
  refType: z.string(),
  refId: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  postedAt: z.string(),
});
export type LedgerEntryDto = z.infer<typeof ledgerEntryDtoSchema>;

export const triggerPayoutInputSchema = z.object({
  merchantId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type TriggerPayoutInput = z.infer<typeof triggerPayoutInputSchema>;
