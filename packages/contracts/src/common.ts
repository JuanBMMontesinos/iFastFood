/**
 * Schemas comuns: erro de API, paginação, dinheiro, timestamps.
 * Usados por web (zod), admin (zod) e como fonte dos endpoints abertos.
 */
import { z } from 'zod';

/** UUID v4 canônico. */
export const uuidSchema = z.string().uuid();

/** Dinheiro em centavos — nunca float na borda da API. */
export const moneyCentsSchema = z.number().int().min(0);

/** E-mail simples (MVP: validação de sintaxe; existência é checada por OTP). */
export const emailSchema = z.string().trim().email().max(254).toLowerCase();

/**
 * Telefone E.164 do Brasil: +55 + DDD + número (10 ou 11 dígitos).
 * Ex.: +5511987654321
 */
export const phoneBrSchema = z
  .string()
  .regex(/^\+55\d{10,11}$/, 'Telefone deve estar em formato +55DD nudos (ex.: +5511987654321)');

/**
 * Política de senha do plano de segurança (ASVS L2):
 * mínimo 8 caracteres com upper, lower e dígito.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .max(72)
  .regex(/[a-z]/, 'Senha deve conter letra minúscula')
  .regex(/[A-Z]/, 'Senha deve conter letra maiúscula')
  .regex(/\d/, 'Senha deve conter dígito');

export const nameSchema = z.string().trim().min(2).max(120);

// ---- Paginação -------------------------------------------------------------
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginatedMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

// ---- Erro de API -----------------------------------------------------------
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.array(z.string()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ---- Helpers ---------------------------------------------------------------
export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    meta: paginatedMetaSchema,
    items: z.array(itemSchema),
  });
}
