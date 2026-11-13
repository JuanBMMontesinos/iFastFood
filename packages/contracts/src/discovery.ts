/**
 * F3 — Contratos de Descoberta (Discovery): feed de lojas abertas e detalhes públicos.
 */
import { z } from 'zod';
import { uuidSchema } from './common';

export const discoveryFeedQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  categoryId: uuidSchema.optional(),
  query: z.string().trim().max(100).optional(),
});
export type DiscoveryFeedQuery = z.infer<typeof discoveryFeedQuerySchema>;

export const discoveryMerchantCardSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  categoryId: uuidSchema,
  categoryName: z.string(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  ratingAvg: z.number(),
  ratingCount: z.number(),
  orderPrepMinutes: z.number().nullable(),
  distanceKm: z.number(),
  deliveryFeeCents: z.number(),
  minOrderCents: z.number(),
  etaMinMinutes: z.number(),
  etaMaxMinutes: z.number(),
  isOpen: z.boolean(),
});
export type DiscoveryMerchantCard = z.infer<typeof discoveryMerchantCardSchema>;

export const discoveryFeedResponseSchema = z.object({
  merchants: z.array(discoveryMerchantCardSchema),
});
export type DiscoveryFeedResponse = z.infer<typeof discoveryFeedResponseSchema>;
