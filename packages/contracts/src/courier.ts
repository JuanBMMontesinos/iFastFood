import { z } from 'zod';

export const vehicleTypeSchema = z.enum(['MOTORCYCLE', 'CAR', 'BICYCLE', 'VAN']);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

export const courierStatusSchema = z.enum([
  'ONBOARDING',
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'BLOCKED',
]);
export type CourierStatus = z.infer<typeof courierStatusSchema>;

export const courierDocumentTypeSchema = z.enum([
  'CNH',
  'CRLV',
  'ANTT',
  'CRIMINAL_RECORD',
  'SELFIE',
  'PROOF_ADDRESS',
]);
export type CourierDocumentType = z.infer<typeof courierDocumentTypeSchema>;

export const documentStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const courierOnboardingInputSchema = z.object({
  vehicleType: vehicleTypeSchema,
  plate: z.string().trim().min(7).max(8).optional(),
});
export type CourierOnboardingInput = z.infer<typeof courierOnboardingInputSchema>;

export const courierDocumentUploadInputSchema = z.object({
  type: courierDocumentTypeSchema,
  fileUrl: z.string().url('URL do documento inválida'),
});
export type CourierDocumentUploadInput = z.infer<typeof courierDocumentUploadInputSchema>;

export const courierShiftToggleInputSchema = z.object({
  action: z.enum(['START', 'END']),
});
export type CourierShiftToggleInput = z.infer<typeof courierShiftToggleInputSchema>;

export const courierLocationUpdateInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type CourierLocationUpdateInput = z.infer<typeof courierLocationUpdateInputSchema>;

export const courierReviewInputSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'BLOCK']),
  rejectReason: z.string().trim().min(3).optional(),
});
export type CourierReviewInput = z.infer<typeof courierReviewInputSchema>;

export const courierDocumentDtoSchema = z.object({
  id: z.string(),
  type: courierDocumentTypeSchema,
  fileUrl: z.string(),
  status: documentStatusSchema,
  rejectReason: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type CourierDocumentDto = z.infer<typeof courierDocumentDtoSchema>;

export const courierProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: courierStatusSchema,
  vehicleType: vehicleTypeSchema,
  plate: z.string().nullable().optional(),
  ratingAvg: z.number(),
  ratingCount: z.number(),
  isOnline: z.boolean(),
  activeShiftId: z.string().nullable().optional(),
  documents: z.array(courierDocumentDtoSchema).default([]),
});
export type CourierProfile = z.infer<typeof courierProfileSchema>;
