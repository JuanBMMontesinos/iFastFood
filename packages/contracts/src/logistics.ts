import { z } from 'zod';

export const deliveryStatusSchema = z.enum([
  'OFFERED',
  'ACCEPTED',
  'PICKED_UP',
  'IN_ROUTE',
  'DELIVERED',
  'RETURNED_TO_MERCHANT',
]);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const deliveryOfferDtoSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderCode: z.string(),
  storeName: z.string(),
  storeAddress: z.string(),
  customerAddress: z.string(),
  distanceKm: z.number(),
  feeCourierCents: z.number(),
  offeredAt: z.string(),
});
export type DeliveryOfferDto = z.infer<typeof deliveryOfferDtoSchema>;

export const deliveryActionInputSchema = z.object({
  action: z.enum(['ACCEPT', 'PICK_UP', 'IN_ROUTE', 'DELIVER', 'RETURN_TO_MERCHANT']),
  verificationCode: z.string().trim().min(4).max(6).optional(),
  proofUrl: z.string().url().optional(),
  notes: z.string().trim().optional(),
});
export type DeliveryActionInput = z.infer<typeof deliveryActionInputSchema>;

export const courierLiveLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  recordedAt: z.string(),
  onDelivery: z.boolean(),
});
export type CourierLiveLocation = z.infer<typeof courierLiveLocationSchema>;

export const deliveryTrackingDtoSchema = z.object({
  deliveryId: z.string(),
  orderId: z.string(),
  orderCode: z.string(),
  status: deliveryStatusSchema,
  courier: z
    .object({
      id: z.string(),
      vehicleType: z.string(),
      plate: z.string().nullable().optional(),
      ratingAvg: z.number(),
    })
    .nullable()
    .optional(),
  currentLocation: courierLiveLocationSchema.nullable().optional(),
  pickedUpAt: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
});
export type DeliveryTrackingDto = z.infer<typeof deliveryTrackingDtoSchema>;
