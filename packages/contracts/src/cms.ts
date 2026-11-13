import { z } from 'zod';

export const CmsSectionSchema = z.object({
  id: z.string(),
  type: z.enum(['hero', 'text', 'features', 'faq', 'cta', 'banner']),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  items: z.array(z.record(z.any())).optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
});

export type CmsSectionDto = z.infer<typeof CmsSectionSchema>;

export const CmsPageSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  sections: z.array(CmsSectionSchema),
  published: z.boolean(),
  publishedAt: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export type CmsPageDto = z.infer<typeof CmsPageSchema>;

export const UpsertCmsPageSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  sections: z.array(CmsSectionSchema),
  published: z.boolean().default(true),
});

export type UpsertCmsPageInput = z.infer<typeof UpsertCmsPageSchema>;

export const LeadCaptureSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  type: z.enum(['CUSTOMER', 'MERCHANT', 'COURIER']),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export type LeadCaptureInput = z.infer<typeof LeadCaptureSchema>;

export interface LeadCaptureResponse {
  success: boolean;
  leadId: string;
  message: string;
}
