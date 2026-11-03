import { z } from 'zod';

/** Corpo de POST /auth/refresh e /auth/logout (refresh cru, 43+ chars base64url). */
export const refreshBodySchema = z
  .object({
    refreshToken: z.string().min(20).max(512),
  })
  .strict();
export type RefreshBody = z.infer<typeof refreshBodySchema>;
