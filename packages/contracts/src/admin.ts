import { z } from 'zod';

export const AdminDashboardMetricsSchema = z.object({
  gmvCents: z.number().int().nonnegative(),
  netRevenueCents: z.number().int().nonnegative(),
  deliveredOrdersCount: z.number().int().nonnegative(),
  activeCouriersCount: z.number().int().nonnegative(),
  activeMerchantsCount: z.number().int().nonnegative(),
  pendingKycCount: z.number().int().nonnegative(),
});

export type AdminDashboardMetricsDto = z.infer<typeof AdminDashboardMetricsSchema>;

export const KycQueueItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['MERCHANT', 'COURIER']),
  document: z.string(),
  submittedAt: z.string(),
  status: z.string(),
  details: z.string().optional(),
});

export type KycQueueItemDto = z.infer<typeof KycQueueItemSchema>;

export const ReviewKycInputSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().optional(),
});

export type ReviewKycInput = z.infer<typeof ReviewKycInputSchema>;

export const ShowcaseDeliverySchema = z.object({
  productName: z.string(),
  merchantName: z.string(),
  courierName: z.string(),
  vehicleDescription: z.string(),
  estimatedMinutes: z.number().int(),
  pinCode: z.string(),
  paymentGateway: z.string(),
  distanceKm: z.number(),
  statusDescription: z.string(),
});

export type ShowcaseDeliveryDto = z.infer<typeof ShowcaseDeliverySchema>;

export const PlatformStatsSchema = z.object({
  deliveredOrdersCount: z.number().int().nonnegative(),
  activeMerchantsCount: z.number().int().nonnegative(),
  activeCouriersCount: z.number().int().nonnegative(),
  averageRating: z.number(),
  onTimeDeliveryRate: z.number(),
  courierTipPassThroughPercent: z.number(),
  showcaseDelivery: ShowcaseDeliverySchema.optional(),
});

export type PlatformStatsDto = z.infer<typeof PlatformStatsSchema>;
