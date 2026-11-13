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

/**
 * CNPJ (14 dígitos) com dígitos verificadores válidos.
 * Aceita formatado ou apenas dígitos; normaliza para 14 dígitos.
 */
export const cnpjSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 14, 'CNPJ deve ter 14 dígitos')
  .refine(
    (v) => !/^(\d)\1+$/.test(v),
    'CNPJ inválido (sequência repetida)',
  )
  .refine((v) => isValidCnpj(v), 'CNPJ inválido (dígitos verificadores)');

/** Algoritmo oficial dos dígitos verificadores do CNPJ (pesos 2..9, 5, 4, 3, 2). */
export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  const calc = (base: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(base[i]) * weights[i]!;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return Number(digits[12]) === d1 && Number(digits[13]) === d2;
}

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
